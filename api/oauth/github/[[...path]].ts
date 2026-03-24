import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize as serializeCookie } from "cookie";
import axios from "axios";
import * as db from "../../../server/db";
import { sdk } from "../../../server/_core/sdk";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

export const config = {
  runtime: "nodejs",
};

function isSecureRequest(req: VercelRequest) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");
  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

function getBaseUrl(req: VercelRequest) {
  const protocol = isSecureRequest(req) ? "https" : "http";
  const host = req.headers.host || "localhost:3000";
  return `${protocol}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : path ? [path] : [];
  const isCallback = pathArray.includes("callback");

  if (!isCallback) {
    // Redirect to GitHub OAuth
    const redirectUri = `${getBaseUrl(req)}/api/oauth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
      return res.status(500).send("GitHub Client ID not configured.");
    }

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email`;
    return res.redirect(url);
  }

  // Handle callback
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send("Code required");
  }

  try {
    const { data: tokenData } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const { data: userInfo } = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    let email = userInfo.email;
    if (!email) {
      // Fetching emails if primary not exposed
      const { data: emails } = await axios.get(
        "https://api.github.com/user/emails",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );
      const primary = emails.find((e: any) => e.primary);
      email = primary ? primary.email : null;
    }

    const openId = `github:${userInfo.id}`;
    const existingUser = await db.getUserByOpenId(openId);

    await db.upsertUser(
      existingUser
        ? {
            openId,
            loginMethod: "github",
            lastSignedIn: new Date(),
          }
        : {
            openId,
            name: userInfo.name || userInfo.login || null,
            email: email || null,
            loginMethod: "github",
            lastSignedIn: new Date(),
          }
    );

    const sessionToken = await sdk.createSessionToken(openId, {
      name: existingUser?.name || userInfo.name || userInfo.login || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const isSecure = isSecureRequest(req);
    const cookie = serializeCookie(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: isSecure ? "none" : "lax",
      secure: isSecure,
      maxAge: ONE_YEAR_MS / 1000,
    });

    res.setHeader("Set-Cookie", cookie);
    return res.redirect(302, "/");
  } catch (e: any) {
    console.error("GitHub OAuth error", e?.response?.data || e.message);
    return res.status(500).send("GitHub authentication failed.");
  }
}
