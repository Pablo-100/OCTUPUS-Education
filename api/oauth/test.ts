import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { serialize as serializeCookie } from "cookie";
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
  try {
    const openId = `test:mockuser`;

    await db.upsertUser({
      openId,
      name: "Test Admin",
      email: "admin@rhcsa.local",
      loginMethod: "test",
      lastSignedIn: new Date(),
    });

    const sessionToken = await sdk.createSessionToken(openId, {
      name: "Test Admin",
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
    console.error("Test auth error", e);
    return res.status(500).send("Test authentication failed.");
  }
}
