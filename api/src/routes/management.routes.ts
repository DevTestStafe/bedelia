import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../types/roles.js";

export const managementRouter = Router();

managementRouter.get(
  "/summary",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  (_req, res) => {
    res.json({
      module: "jefe-subjefe",
      message: "Módulo de aprobación y control"
    });
  }
);
