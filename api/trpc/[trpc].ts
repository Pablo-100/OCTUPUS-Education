import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../server/routers";
import { createContext } from "../../server/_core/context";
import express from "express";

export const config = {
  runtime: "nodejs",
};

// Create a mini express app for tRPC
const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Forward to express app
  return new Promise<void>(resolve => {
    app(req as any, res as any, () => {
      resolve();
    });
  });
}
