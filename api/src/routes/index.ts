import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { employeesRouter } from "./employees.routes.js";
import { healthRouter } from "./health.routes.js";
import { managementRouter } from "./management.routes.js";
import { studentsRouter } from "./students.routes.js";
import { teachersRouter } from "./teachers.routes.js";
import { subjectsRouter } from "./subjects.routes.js";
import examBoardsRouter from "./exam-boards.routes.js";
import certificatesRouter from "./certificates.routes.js";
import { usersRouter } from "./users.routes.js";

export const appRouter = Router();

appRouter.use(healthRouter);
appRouter.use("/auth", authRouter);
appRouter.use("/users", usersRouter);
appRouter.use("/modulos/empleados", employeesRouter);
appRouter.use("/modulos/jefatura", managementRouter);
appRouter.use("/modulos/jefatura", certificatesRouter);
appRouter.use("/modulos/profesores", teachersRouter);
appRouter.use("/modulos/profesores", examBoardsRouter);
appRouter.use("/modulos/alumnos", studentsRouter);
appRouter.use("/modulos/alumnos", certificatesRouter);
appRouter.use("/modulos/materias", subjectsRouter);
