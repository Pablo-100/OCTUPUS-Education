import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  parse as parseCookieHeader,
  serialize as serializeCookie,
} from "cookie";
import * as db from "../../server/db";
import { sdk } from "../../server/_core/sdk";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name, action } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const openId = `local:${email}`;
    const existingUser = await db.getUserByOpenId(openId);

    await db.upsertUser(
      existingUser
        ? {
            openId,
            loginMethod: action || "local",
            lastSignedIn: new Date(),
          }
        : {
            openId,
            name: name || email.split("@")[0],
            email: email,
            loginMethod: action || "local",
            lastSignedIn: new Date(),
          }
    );

    const sessionToken = await sdk.createSessionToken(openId, {
      name: existingUser?.name || name || email.split("@")[0],
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
    return res.status(200).json({ success: true });
  } catch (e: any) {
    console.error("Local auth error", e);
    return res.status(500).json({ error: "Authentication failed." });
  }
}
