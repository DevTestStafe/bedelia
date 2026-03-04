import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { firestore } from "../config/firebase.js";
import { ROLES } from "../types/roles.js";
import { writeAuditEvent } from "../services/audit.service.js";

export const subjectsRouter = Router();

const createSubjectSchema = z.object({
  careerId: z.string().min(1),
  name: z.string().min(1).max(200),
  year: z.number().int().min(1).max(4)
});

const createCommissionSchema = z.object({
  subjectId: z.string().min(1),
  name: z.string().min(1).max(100),
  teacherId: z.string().optional()
});

const enrollInSubjectSchema = z.object({
  studentId: z.string().min(1),
  subjectId: z.string().min(1),
  commissionId: z.string().optional(),
  year: z.number().int().min(2000).max(2100)
});

// ========== Materias ==========

subjectsRouter.get(
  "/materias",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA, ROLES.PROFESOR),
  async (_req, res) => {
    const snapshot = await firestore
      .collection("subjects")
      .orderBy("year", "asc")
      .orderBy("name", "asc")
      .limit(200)
      .get();

    const subjects = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        subjectId: doc.id,
        careerId: data.careerId ?? "",
        name: data.name ?? "",
        year: data.year ?? 0,
        createdAt: data.createdAt ?? null
      };
    });

    return res.json({
      count: subjects.length,
      items: subjects
    });
  }
);

subjectsRouter.post(
  "/materias",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = createSubjectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para crear materia",
        issues: parsed.error.issues
      });
    }

    const now = new Date().toISOString();
    const subjectRef = firestore.collection("subjects").doc();

    const payload = {
      careerId: parsed.data.careerId,
      name: parsed.data.name,
      year: parsed.data.year,
      createdAt: now,
      createdBy: req.authUser?.uid ?? "unknown"
    };

    await subjectRef.set(payload);

    await writeAuditEvent({
      entityType: "subject",
      entityId: subjectRef.id,
      action: "CREATE",
      performedBy: req.authUser?.uid ?? "unknown",
      after: payload,
      reason: "Materia creada",
      sourceModule: "SUBJECTS"
    });

    return res.status(201).json({
      subjectId: subjectRef.id,
      ...payload
    });
  }
);

// ========== Comisiones ==========

subjectsRouter.get(
  "/comisiones",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA, ROLES.PROFESOR),
  async (req, res) => {
    const subjectIdParam = req.query.subjectId;
    const limit = 200;

    let query = firestore.collection("commissions").orderBy("name", "asc").limit(limit);

    if (subjectIdParam && typeof subjectIdParam === "string") {
      query = firestore
        .collection("commissions")
        .where("subjectId", "==", subjectIdParam)
        .orderBy("name", "asc")
        .limit(limit);
    }

    const snapshot = await query.get();
    const commissions = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        commissionId: doc.id,
        subjectId: data.subjectId ?? "",
        name: data.name ?? "",
        teacherId: data.teacherId ?? null,
        createdAt: data.createdAt ?? null
      };
    });

    return res.json({
      count: commissions.length,
      items: commissions
    });
  }
);

subjectsRouter.post(
  "/comisiones",
  authenticate,
  authorize(ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = createCommissionSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para crear comisión",
        issues: parsed.error.issues
      });
    }

    const now = new Date().toISOString();
    const commissionRef = firestore.collection("commissions").doc();

    const payload = {
      subjectId: parsed.data.subjectId,
      name: parsed.data.name,
      teacherId: parsed.data.teacherId ?? null,
      createdAt: now,
      createdBy: req.authUser?.uid ?? "unknown"
    };

    await commissionRef.set(payload);

    await writeAuditEvent({
      entityType: "commission",
      entityId: commissionRef.id,
      action: "CREATE",
      performedBy: req.authUser?.uid ?? "unknown",
      after: payload,
      reason: "Comisión creada",
      sourceModule: "SUBJECTS"
    });

    return res.status(201).json({
      commissionId: commissionRef.id,
      ...payload
    });
  }
);

// ========== Inscripciones a materias ==========

subjectsRouter.post(
  "/inscripciones-materias",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA),
  async (req, res) => {
    const parsed = enrollInSubjectSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos inválidos para inscripción a materia",
        issues: parsed.error.issues
      });
    }

    const { studentId, subjectId, commissionId, year } = parsed.data;

    // Validar que el alumno tenga inscripción anual aprobada para el año
    const annualEnrollmentSnapshot = await firestore
      .collection("academic_year_enrollments")
      .where("studentId", "==", studentId)
      .where("year", "==", year)
      .where("status", "==", "APROBADA")
      .limit(1)
      .get();

    if (annualEnrollmentSnapshot.empty) {
      return res.status(400).json({
        message: "No se puede inscribir a materia",
        reason: `El alumno no tiene inscripción anual APROBADA para el año ${year}`
      });
    }

    // Verificar si ya existe inscripción
    const existingSnapshot = await firestore
      .collection("subject_enrollments")
      .where("studentId", "==", studentId)
      .where("subjectId", "==", subjectId)
      .where("year", "==", year)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return res.status(409).json({
        message: "El alumno ya está inscripto en esta materia para el año especificado"
      });
    }

    const now = new Date().toISOString();
    const enrollmentRef = firestore.collection("subject_enrollments").doc();

    const payload = {
      studentId,
      subjectId,
      commissionId: commissionId ?? null,
      year,
      status: "ACTIVA",
      createdAt: now,
      createdBy: req.authUser?.uid ?? "unknown"
    };

    await enrollmentRef.set(payload);

    await writeAuditEvent({
      entityType: "subject_enrollment",
      entityId: enrollmentRef.id,
      action: "CREATE",
      performedBy: req.authUser?.uid ?? "unknown",
      after: payload,
      reason: "Inscripción a materia creada",
      sourceModule: "SUBJECTS"
    });

    return res.status(201).json({
      enrollmentId: enrollmentRef.id,
      ...payload
    });
  }
);

subjectsRouter.get(
  "/inscripciones-materias",
  authenticate,
  authorize(ROLES.EMPLEADO, ROLES.JEFE_BEDELIA, ROLES.SUBJEFE_BEDELIA, ROLES.PROFESOR),
  async (req, res) => {
    const studentIdParam = req.query.studentId;
    const yearParam = req.query.year;
    const limit = 200;

    let query = firestore.collection("subject_enrollments").orderBy("createdAt", "desc").limit(limit);

    if (studentIdParam && typeof studentIdParam === "string") {
      query = firestore
        .collection("subject_enrollments")
        .where("studentId", "==", studentIdParam)
        .orderBy("createdAt", "desc")
        .limit(limit);
    }

    if (yearParam && typeof yearParam === "string") {
      const year = Number(yearParam);
      if (!isNaN(year)) {
        query = firestore
          .collection("subject_enrollments")
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
        studentId: data.studentId ?? "",
        subjectId: data.subjectId ?? "",
        commissionId: data.commissionId ?? null,
        year: data.year ?? 0,
        status: data.status ?? "ACTIVA",
        createdAt: data.createdAt ?? null
      };
    });

    return res.json({
      count: enrollments.length,
      items: enrollments
    });
  }
);
