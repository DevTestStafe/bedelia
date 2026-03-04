import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { ROLES } from "../types/roles.js";

export const studentsRouter = Router();

studentsRouter.get(
  "/summary",
  authenticate,
  authorize(ROLES.ALUMNO),
  (_req, res) => {
    res.json({
      module: "alumnos",
      message: "Módulo de consulta e inscripciones"
    });
  }
);
