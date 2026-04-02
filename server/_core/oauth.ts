import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import axios from "axios";
import express from "express";

// ✅ FIX: Render ykhdem reverse proxy — req.protocol yarja3 "http" dima
// Lazem nqraw x-forwarded-proto bch naamlou redirect URL b https sahiha
function getBaseUrl(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = forwardedProto
    ? (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto.split(",")[0]).trim()
    : req.protocol;
  const host = req.get("host") || "localhost:5000";
  return `${proto}://${host}`;
}

export function registerOAuthRoutes(app: Express) {
  app.use(express.json());

  app.post("/api/oauth/local", async (req: Request, res: Response) => {
    try {
      const { email, name, action } = req.body;
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

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.status(200).json({ success: true });
    } catch (e: any) {
      console.error("Local auth error", e);
      res.status(500).json({ error: "Authentication failed." });
    }
  });

  app.get("/api/oauth/test", async (req: Request, res: Response) => {
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

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
    } catch (e: any) {
      console.error("Test auth error", e);
      res.status(500).send("Test authentication failed.");
    }
  });

  // ✅ Google OAuth — initiate
  app.get("/api/oauth/google", (req: Request, res: Response) => {
    const redirectUri = `${getBaseUrl(req)}/api/oauth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      return res.status(500).send("Google Client ID not configured.");
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile`;
    res.redirect(url);
  });

  // ✅ Google OAuth — callback
  app.get("/api/oauth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("Code required");
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

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
    } catch (e: any) {
      console.error("Google OAuth error", e?.response?.data || e.message);
      res.status(500).send("Google authentication failed.");
    }
  });

  // ✅ GitHub OAuth — initiate
  app.get("/api/oauth/github", (req: Request, res: Response) => {
    const redirectUri = `${getBaseUrl(req)}/api/oauth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId)
      return res.status(500).send("GitHub Client ID not configured.");
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email`;
    res.redirect(url);
  });

  // ✅ GitHub OAuth — callback
  app.get("/api/oauth/github/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send("Code required");
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

      const { data: userInfo } = await axios.get(
        "https://api.github.com/user",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        }
      );

      let email = userInfo.email;
      if (!email) {
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

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });
      res.redirect(302, "/");
    } catch (e: any) {
      console.error("GitHub OAuth error", e?.response?.data || e.message);
      res.status(500).send("GitHub authentication failed.");
    }
  });
}
