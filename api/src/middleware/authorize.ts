import type { NextFunction, Request, Response } from "express";
import type { Role } from "../types/roles.js";

export function authorize(...requiredRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRoles = req.authUser?.roles ?? [];
    const isAuthorized = requiredRoles.some((role) => userRoles.includes(role));

    if (!isAuthorized) {
      return res.status(403).json({ message: "Sin permisos para esta acción" });
    }

    return next();
  };
}
