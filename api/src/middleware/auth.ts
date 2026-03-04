import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../config/firebase.js";
import type { Role } from "../types/roles.js";

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Falta token Bearer" });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    const roles = (decoded.roles ?? []) as Role[];

    req.authUser = {
      uid: decoded.uid,
      username: (decoded.name as string) ?? decoded.uid,
      roles
    };

    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }
}
