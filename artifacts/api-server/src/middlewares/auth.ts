import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  req.userId = userId;
  next();
}

export function currentUserId(req: Request): string {
  if (!req.userId) {
    throw new Error("Authenticated user context is missing.");
  }
  return req.userId;
}
