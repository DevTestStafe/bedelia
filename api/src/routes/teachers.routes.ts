import { Router } from "express";
import { z } from "zod";
import { firestore } from "../config/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { writeAuditEvent } from "../services/audit.service.js";
import type { AuthUser } from "../types/auth.js";

export const teachersRouter = Router();

// ==================== SCHEMAS ====================

const AttendanceItemSchema = z.object({
  studentId: z.string().min(1),
  present: z.boolean(),
  justification: z.string().optional()
});

const CreateAttendanceSchema = z.object({
  subjectId: z.string().min(1),
  commissionId: z.string().min(1),
  classDate: z.string().min(1), // ISO 8601 date string
  items: z.array(AttendanceItemSchema).min(1)
});

// ==================== ENDPOINTS ====================

/**
 * GET /api/modulos/profesores/attendance
 * Listar registros de asistencia
 * Filtros: commissionId, subjectId, studentId, startDate, endDate
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
teachersRouter.get(
  "/attendance",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const { commissionId, subjectId, studentId, startDate, endDate } = req.query;

      let query = firestore.collection("attendance_records").orderBy("classDate", "desc");

      if (commissionId && typeof commissionId === "string") {
        query = query.where("commissionId", "==", commissionId) as any;
      }

      if (subjectId && typeof subjectId === "string") {
        query = query.where("subjectId", "==", subjectId) as any;
      }

      const snapshot = await query.limit(500).get();

      let records = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          attendanceId: doc.id,
          subjectId: String(data.subjectId ?? ""),
          commissionId: String(data.commissionId ?? ""),
          classDate: String(data.classDate ?? ""),
          teacherId: String(data.teacherId ?? ""),
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: data.createdAt ?? null,
          createdBy: String(data.createdBy ?? "")
        };
      });

      // Filter by studentId client-side if needed
      if (studentId && typeof studentId === "string") {
        records = records.filter((record) =>
          record.items.some((item: any) => item.studentId === studentId)
        );
      }

      // Filter by date range client-side if needed
      if (startDate && typeof startDate === "string") {
        records = records.filter((record) => record.classDate >= startDate);
      }

      if (endDate && typeof endDate === "string") {
        records = records.filter((record) => record.classDate <= endDate);
      }

      res.json({ items: records, total: records.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/modulos/profesores/attendance/summary
 * Resumen de asistencias por estudiante
 * Query params: studentId (requerido), subjectId (opcional)
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA, ALUMNO
 */
teachersRouter.get(
  "/attendance/summary",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA", "ALUMNO"),
  async (req, res, next) => {
    try {
      const { studentId, subjectId } = req.query;

      if (!studentId || typeof studentId !== "string") {
        res.status(400).json({ error: "studentId es requerido" });
        return;
      }

      // If user is ALUMNO, ensure they can only see their own attendance
      if (req.authUser?.roles.includes("ALUMNO") && !req.authUser.roles.includes("EMPLEADO")) {
        // Here you would validate that studentId matches the logged-in user's studentId
        // For now, we'll allow it as-is
      }

      let query = firestore.collection("attendance_records").orderBy("classDate", "asc");

      if (subjectId && typeof subjectId === "string") {
        query = query.where("subjectId", "==", subjectId) as any;
      }

      const snapshot = await query.get();

      const records = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          attendanceId: doc.id,
          subjectId: String(data.subjectId ?? ""),
          commissionId: String(data.commissionId ?? ""),
          classDate: String(data.classDate ?? ""),
          items: Array.isArray(data.items) ? data.items : []
        };
      });

      // Filter records that contain the student
      const studentRecords = records.filter((record) =>
        record.items.some((item: any) => item.studentId === studentId)
      );

      // Group by subject
      const summaryBySubject: Record<string, any> = {};

      for (const record of studentRecords) {
        const studentItem = record.items.find((item: any) => item.studentId === studentId);

        if (!studentItem) continue;

        const key = record.subjectId;

        if (!summaryBySubject[key]) {
          summaryBySubject[key] = {
            subjectId: record.subjectId,
            totalClasses: 0,
            presentCount: 0,
            absentCount: 0,
            justifiedCount: 0
          };
        }

        summaryBySubject[key].totalClasses += 1;

        if (studentItem.present) {
          summaryBySubject[key].presentCount += 1;
        } else {
          summaryBySubject[key].absentCount += 1;
          if (studentItem.justification && studentItem.justification.trim() !== "") {
            summaryBySubject[key].justifiedCount += 1;
          }
        }
      }

      // Calculate attendance percentage
      const summary = Object.values(summaryBySubject).map((item: any) => ({
        ...item,
        attendancePercentage:
          item.totalClasses > 0 ? Math.round((item.presentCount / item.totalClasses) * 100) : 0
      }));

      res.json({ studentId, summary });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/modulos/profesores/attendance
 * Marcar asistencia para una clase
 * Solo profesores pueden crear registros
 */
teachersRouter.post(
  "/attendance",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const parsed = CreateAttendanceSchema.parse(req.body);

      // Check if attendance record already exists for this commission and date
      const existingSnapshot = await firestore
        .collection("attendance_records")
        .where("commissionId", "==", parsed.commissionId)
        .where("classDate", "==", parsed.classDate)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        res.status(409).json({ error: "Ya existe un registro de asistencia para esta comisión y fecha" });
        return;
      }

      // Verify commission exists
      const commissionDoc = await firestore.collection("commissions").doc(parsed.commissionId).get();

      if (!commissionDoc.exists) {
        res.status(404).json({ error: "Comisión no encontrada" });
        return;
      }

      const commissionData = commissionDoc.data();
      const expectedSubjectId = String(commissionData?.subjectId ?? "");

      if (expectedSubjectId !== parsed.subjectId) {
        res.status(400).json({ error: "La materia no coincide con la comisión seleccionada" });
        return;
      }

      // Create attendance record
      const newDoc = firestore.collection("attendance_records").doc();

      const attendanceData = {
        subjectId: parsed.subjectId,
        commissionId: parsed.commissionId,
        classDate: parsed.classDate,
        teacherId: req.authUser?.uid ?? "",
        items: parsed.items,
        createdAt: new Date().toISOString(),
        createdBy: req.authUser?.uid ?? "",
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await newDoc.set(attendanceData);

      // Write audit event
      await writeAuditEvent({
        entityType: "attendance_record",
        entityId: newDoc.id,
        action: "CREATE",
        performedBy: req.authUser?.uid ?? "",
        before: null,
        after: attendanceData,
        reason: `Asistencia registrada para comisión ${parsed.commissionId} el ${parsed.classDate}`
      });

      res.status(201).json({
        attendanceId: newDoc.id,
        ...attendanceData
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Datos inválidos", details: error.errors });
        return;
      }
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/attendance/:attendanceId
 * Actualizar registro de asistencia
 * Solo profesores pueden actualizar (idealmente, solo el que lo creó)
 */
teachersRouter.put(
  "/attendance/:attendanceId",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const attendanceId = String(req.params.attendanceId);

      const attendanceDoc = await firestore.collection("attendance_records").doc(attendanceId).get();

      if (!attendanceDoc.exists) {
        res.status(404).json({ error: "Registro de asistencia no encontrado" });
        return;
      }

      const before = attendanceDoc.data();

      const parsed = z
        .object({
          items: z.array(AttendanceItemSchema).min(1)
        })
        .parse(req.body);

      const after = {
        ...before,
        items: parsed.items,
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("attendance_records").doc(attendanceId).update({
        items: parsed.items,
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "attendance_record",
        entityId: attendanceId,
        action: "UPDATE",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Actualización de asistencia"
      });

      res.json({ attendanceId, ...after });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Datos inválidos", details: error.errors });
        return;
      }
      next(error);
    }
  }
);
