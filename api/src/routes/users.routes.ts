import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { getAuth } from "firebase-admin/auth";
import { ROLES } from "../types/roles.js";

export const usersRouter = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  roles: z.array(z.enum(["ALUMNO", "PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"]))
});

usersRouter.post(
  "/create",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Datos inválidos", details: parsed.error });
      }

      const { email, password, displayName, roles } = parsed.data;
      const auth = getAuth();

      // Create user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName
      });

      // Set custom claims
      await auth.setCustomUserClaims(userRecord.uid, { roles });

      res.json({
        success: true,
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        roles
      });
    } catch (error: any) {
      console.error("Error creating user:", error);

      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({ error: "El email ya está registrado" });
      }
      if (error.code === "auth/invalid-email") {
        return res.status(400).json({ error: "Email inválido" });
      }
      if (error.code === "auth/weak-password") {
        return res.status(400).json({ error: "Contraseña muy débil (mínimo 6 caracteres)" });
      }

      res.status(500).json({ error: "No se pudo crear el usuario", details: error.message });
    }
  }
);

usersRouter.get(
  "/list",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (_req, res) => {
    try {
      const auth = getAuth();
      const users = await auth.listUsers(1000);

      const formattedUsers = users.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "Sin nombre",
        roles: (user.customClaims?.roles as string[]) || [],
        createdAt: user.metadata.creationTime
      }));

      res.json({ users: formattedUsers });
    } catch (error: any) {
      console.error("Error listing users:", error);
      res.status(500).json({ error: "No se pudo listar usuarios", details: error.message });
    }
  }
);
