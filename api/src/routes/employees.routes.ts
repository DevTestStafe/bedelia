import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { firestore } from "../config/firebase.js";
import { ROLES } from "../types/roles.js";
import { writeAuditEvent } from "../services/audit.service.js";
import { generateInternalCode } from "../services/code-generator.service.js";
import { getNextSequence } from "../services/sequences.service.js";
import { canEnrollInYear } from "../services/validation.service.js";

export const employeesRouter = Router();

const createLegajoSchema = z.object({
  studentId: z.string().min(1),
  documentationStatus: z.enum(["INCOMPLETA", "EN_REVISION", "COMPLETA"]),
  careerEnrollmentStatus: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"])
});

const updateLegajoSchema = z.object({
  studentId: z.string().min(1).optional(),
  documentationStatus: z.enum(["INCOMPLETA", "EN_REVISION", "COMPLETA"]).optional(),
  careerEnrollmentStatus: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]).optional(),
  reason: z.string().min(3).max(200).optional()
});

const createAnnualEnrollmentSchema = z.object({
  legajoId: z.string().min(1),
  year: z.number().int().min(2000).max(2100)
});

const updateAnnualEnrollmentSchema = z.object({
  status: z.enum(["PENDIENTE", "APROBADA", "RECHAZADA"]),
  reason: z.string().min(3).max(200).optional()
});

employeesRouter.get(
  "/summary",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  (_req, res) => {
    res.json({
      module: "empleados",
      message: "Módulo habilitado para carga administrativa"
    });
  }
);

employeesRouter.get(
  "/legajos",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    const limit = 50;

    let query = firestore.collection("legajos").orderBy("createdAt", "desc").limit(limit);

    if (code) {
      query = firestore
        .collection("legajos")
        .where("legajoCode", "==", code.toUpperCase())
        .limit(limit);
    }

    const snapshot = await query.get();
    const legajos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        legajoId: doc.id,
        legajoCode: data.legajoCode ?? "",
        studentId: data.studentId ?? "",
        documentationStatus: data.documentationStatus ?? "SIN_ESTADO",
        careerEnrollmentStatus: data.careerEnrollmentStatus ?? "SIN_ESTADO",
        createdAt: data.createdAt ?? null
      };
    });

    return res.json({
      count: legajos.length,
      items: legajos
    });
  }
);

employeesRouter.post(
  "/legajos",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = createLegajoSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para crear legajo",
        issues: parsed.error.issues
      });
    }

    const now = new Date().toISOString();
    const sequence = await getNextSequence("LEG");
    const legajoCode = generateInternalCode("LEG", sequence);
    const legajoRef = firestore.collection("legajos").doc();

    const payload = {
      legajoCode,
      studentId: parsed.data.studentId,
      documentationStatus: parsed.data.documentationStatus,
      careerEnrollmentStatus: parsed.data.careerEnrollmentStatus,
      status: "ACTIVO",
      createdAt: now,
      createdBy: req.authUser?.uid ?? "unknown",
      updatedAt: now,
      updatedBy: req.authUser?.uid ?? "unknown",
      version: 1
    };

    await legajoRef.set(payload);

    await writeAuditEvent({
      entityType: "legajo",
      entityId: legajoRef.id,
      action: "CREATE",
      performedBy: req.authUser?.uid ?? "unknown",
      after: payload,
      reason: "Alta de legajo por módulo empleados",
      sourceModule: "EMPLEADOS"
    });

    return res.status(201).json({
      legajoId: legajoRef.id,
      ...payload
    });
  }
);

employeesRouter.put(
  "/legajos/:legajoId",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = updateLegajoSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para actualizar legajo",
        issues: parsed.error.issues
      });
    }

    const legajoIdParam = req.params.legajoId;
    const legajoId = typeof legajoIdParam === "string" ? legajoIdParam : "";

    if (!legajoId) {
      return res.status(400).json({ message: "Identificador de legajo inválido" });
    }

    const legajoRef = firestore.collection("legajos").doc(legajoId);
    const snapshot = await legajoRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "Legajo no encontrado" });
    }

    const before = snapshot.data() ?? {};
    const changes = {
      ...(parsed.data.studentId ? { studentId: parsed.data.studentId } : {}),
      ...(parsed.data.documentationStatus
        ? { documentationStatus: parsed.data.documentationStatus }
        : {}),
      ...(parsed.data.careerEnrollmentStatus
        ? { careerEnrollmentStatus: parsed.data.careerEnrollmentStatus }
        : {})
    };

    if (Object.keys(changes).length === 0) {
      return res.status(400).json({ message: "No hay cambios para aplicar" });
    }

    const now = new Date().toISOString();
    const nextVersion = Number(before.version ?? 1) + 1;

    const updatePayload = {
      ...changes,
      updatedAt: now,
      updatedBy: req.authUser?.uid ?? "unknown",
      version: nextVersion
    };

    await legajoRef.update(updatePayload);

    const after = {
      ...before,
      ...updatePayload
    };

    await writeAuditEvent({
      entityType: "legajo",
      entityId: legajoId,
      action: "UPDATE",
      performedBy: req.authUser?.uid ?? "unknown",
      before,
      after,
      reason: parsed.data.reason ?? "Actualización de legajo",
      sourceModule: "EMPLEADOS"
    });

    return res.json({
      legajoId,
      ...after
    });
  }
);

employeesRouter.get(
  "/legajos/:legajoId/auditoria",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const legajoIdParam = req.params.legajoId;
    const legajoId = typeof legajoIdParam === "string" ? legajoIdParam : "";

    if (!legajoId) {
      return res.status(400).json({ message: "Identificador de legajo inválido" });
    }

    const snapshot = await firestore
      .collection("audit_events")
      .where("entityId", "==", legajoId)
      .orderBy("performedAt", "desc")
      .limit(50)
      .get();

    const events = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          auditId: doc.id,
          entityType: String(data.entityType ?? ""),
          entityId: String(data.entityId ?? ""),
          action: String(data.action ?? ""),
          performedBy: String(data.performedBy ?? ""),
          performedAt: String(data.performedAt ?? ""),
          reason: data.reason ? String(data.reason) : undefined,
          sourceModule: data.sourceModule ? String(data.sourceModule) : undefined
        };
      })
      .filter((item) => item.entityType === "legajo");

    return res.json({
      count: events.length,
      items: events
    });
  }
);

// ========== Inscripciones anuales ==========

employeesRouter.get(
  "/inscripciones-anuales",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const yearParam = req.query.year;
    const statusParam = req.query.status;
    const limit = 100;

    let query = firestore
      .collection("academic_year_enrollments")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (yearParam && typeof yearParam === "string") {
      const year = Number(yearParam);
      if (!isNaN(year)) {
        query = firestore
          .collection("academic_year_enrollments")
          .where("year", "==", year)
          .orderBy("createdAt", "desc")
          .limit(limit);
      }
    }

    const snapshot = await query.get();
    const enrollments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        enrollmentId: doc.id,
        legajoId: data.legajoId ?? "",
        studentId: data.studentId ?? "",
        year: data.year ?? 0,
        status: data.status ?? "PENDIENTE",
        validationSummary: data.validationSummary ?? "",
        createdAt: data.createdAt ?? null,
        updatedAt: data.updatedAt ?? null
      };
    });

    const filtered =
      statusParam && typeof statusParam === "string"
        ? enrollments.filter((e) => e.status === statusParam)
        : enrollments;

    return res.json({
      count: filtered.length,
      items: filtered
    });
  }
);

employeesRouter.post(
  "/inscripciones-anuales",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = createAnnualEnrollmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para crear inscripción anual",
        issues: parsed.error.issues
      });
    }

    const { legajoId, year } = parsed.data;

    // Validar documentación completa
    const validation = await canEnrollInYear(legajoId);
    if (!validation.valid) {
      return res.status(400).json({
        message: "No se puede inscribir al año lectivo",
        reason: validation.reason
      });
    }

    // Obtener studentId del legajo
    const legajoSnapshot = await firestore.collection("legajos").doc(legajoId).get();
    const studentId = legajoSnapshot.data()?.studentId ?? "";

    // Verificar si ya existe inscripción para este año
    const existingSnapshot = await firestore
      .collection("academic_year_enrollments")
      .where("legajoId", "==", legajoId)
      .where("year", "==", year)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        message: "Ya existe una inscripción para este legajo en el año especificado"
      });
    }

    const now = new Date().toISOString();
    const enrollmentRef = firestore.collection("academic_year_enrollments").doc();

    const payload = {
      legajoId,
      studentId,
      year,
      status: "PENDIENTE",
      validationSummary: "Documentación completa y habilitada para inscripción",
      createdAt: now,
      createdBy: req.authUser?.uid ?? "unknown",
      updatedAt: now,
      updatedBy: req.authUser?.uid ?? "unknown"
    };

    await enrollmentRef.set(payload);

    await writeAuditEvent({
      entityType: "annual_enrollment",
      entityId: enrollmentRef.id,
      action: "CREATE",
      performedBy: req.authUser?.uid ?? "unknown",
      after: payload,
      reason: "Inscripción anual creada",
      sourceModule: "EMPLEADOS"
    });

    return res.status(201).json({
      enrollmentId: enrollmentRef.id,
      ...payload
    });
  }
);

employeesRouter.put(
  "/inscripciones-anuales/:enrollmentId",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = updateAnnualEnrollmentSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para actualizar inscripción",
        issues: parsed.error.issues
      });
    }

    const enrollmentIdParam = req.params.enrollmentId;
    const enrollmentId = typeof enrollmentIdParam === "string" ? enrollmentIdParam : "";

    if (!enrollmentId) {
      return res.status(400).json({ message: "ID de inscripción inválido" });
    }

    const enrollmentRef = firestore.collection("academic_year_enrollments").doc(enrollmentId);
    const snapshot = await enrollmentRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    const before = snapshot.data() ?? {};
    const now = new Date().toISOString();

    const updatePayload = {
      status: parsed.data.status,
      updatedAt: now,
      updatedBy: req.authUser?.uid ?? "unknown"
    };

    await enrollmentRef.update(updatePayload);

    const after = {
      ...before,
      ...updatePayload
    };

    await writeAuditEvent({
      entityType: "annual_enrollment",
      entityId: enrollmentId,
      action: parsed.data.status === "APROBADA" ? "APPROVE" : parsed.data.status === "RECHAZADA" ? "REJECT" : "UPDATE",
      performedBy: req.authUser?.uid ?? "unknown",
      before,
      after,
      reason: parsed.data.reason ?? `Inscripción ${parsed.data.status}`,
      sourceModule: "EMPLEADOS"
    });

    return res.json({
      enrollmentId,
      ...after
    });
  }
);
