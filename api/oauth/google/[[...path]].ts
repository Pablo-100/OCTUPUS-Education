import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize as serializeCookie } from "cookie";
import axios from "axios";
import * as db from "../../../server/db";
import { sdk } from "../../../server/_core/sdk";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;



function getBaseUrl(req: VercelRequest) {
  // Use explicit env var if set (production on Render, etc.)
  if (process.env.OAUTH_SERVER_URL) {
    return process.env.OAUTH_SERVER_URL;
  }
  // Fallback: detect protocol from request headers
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : (forwardedProto ?? "http").split(",")[0].trim();
  const host = req.headers.host || "localhost:3000";
  return `${proto}://${host}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : path ? [path] : [];
  const isCallback = pathArray.includes("callback");

  if (!isCallback) {
    // Redirect to Google OAuth
    const redirectUri = `${getBaseUrl(req)}/api/oauth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(500).send("Google Client ID not configured.");
    }

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile`;
    return res.redirect(url);
  }

  // Handle callback
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send("Code required");
  }

  try {
    const redirectUri = `${getBaseUrl(req)}/api/oauth/google/callback`;
    const { data: tokenData } = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }
    );

    const { data: userInfo } = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const openId = `google:${userInfo.id}`;
    const existingUser = await db.getUserByOpenId(openId);

    await db.upsertUser(
      existingUser
        ? {
            openId,
            loginMethod: "google",
            lastSignedIn: new Date(),
          }
        : {
            openId,
            name: userInfo.name || null,
            email: userInfo.email || null,
            loginMethod: "google",
            lastSignedIn: new Date(),
          }
    );

    const sessionToken = await sdk.createSessionToken(openId, {
      name: existingUser?.name || userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const isSecure = getBaseUrl(req).startsWith("https");
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
    console.error("Google OAuth error", e?.response?.data || e.message);
    return res.status(500).send("Google authentication failed.");
  }
}
