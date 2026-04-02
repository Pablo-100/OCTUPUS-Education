import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  serialize as serializeCookie,
} from "cookie";
import * as db from "../../server/db";
import { sdk } from "../../server/_core/sdk";

const COOKIE_NAME = "app_session_id";
const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;



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
    const normalizedAction =
      action === "login" || action === "register" ? action : null;
    if (!normalizedAction) {
      return res.status(400).json({ error: "Invalid auth action." });
    }

    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!normalizedEmail) {
      return res.status(400).json({ error: "Email is required" });
    }

    const openId = `local:${normalizedEmail}`;
    const existingUser = await db.getUserByOpenId(openId);

    if (normalizedAction === "login" && !existingUser) {
      return res.status(401).json({
        error: "No account found for this email. Please create an account.",
      });
    }

    if (normalizedAction === "register" && existingUser) {
      return res.status(409).json({
        error: "An account with this email already exists. Please sign in.",
      });
    }

    const normalizedName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : normalizedEmail.split("@")[0];

    await db.upsertUser(
      existingUser
        ? {
            openId,
            loginMethod: "local",
            lastSignedIn: new Date(),
          }
        : {
            openId,
            name: normalizedName,
            email: normalizedEmail,
            loginMethod: "local",
            lastSignedIn: new Date(),
          }
    );

    const sessionToken = await sdk.createSessionToken(openId, {
      name: existingUser?.name || normalizedName,
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
