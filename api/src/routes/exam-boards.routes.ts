import { Router } from "express";
import { z } from "zod";
import { firestore } from "../config/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { writeAuditEvent } from "../services/audit.service.js";
import { generateInternalCode } from "../services/code-generator.service.js";
import { getNextSequence } from "../services/sequences.service.js";
import { generateExamBoardEnrollmentsPDF } from "../services/pdf-generator.service.js";

const router = Router();

// ==================== SCHEMAS ====================

const CreateExamBoardSchema = z.object({
  subjectId: z.string().min(1),
  examDate: z.string().min(1), // ISO 8601 date
  enrollmentOpenAt: z.string().min(1), // ISO 8601 datetime
  enrollmentCloseAt: z.string().min(1), // ISO 8601 datetime
  teacherIds: z.array(z.string()).min(1),
  notes: z.string().optional()
});

const EnrollStudentSchema = z.object({
  studentId: z.string().min(1)
});

const GradeItemSchema = z.object({
  studentId: z.string().min(1),
  grade: z.number().min(1).max(10).optional(),
  absent: z.boolean().optional(),
  observation: z.string().optional()
});

const LoadGradesSchema = z.object({
  grades: z.array(GradeItemSchema).min(1)
});

// ==================== EXAM BOARDS ENDPOINTS ====================

/**
 * GET /api/modulos/profesores/exam-boards
 * Listar mesas examinadoras
 * Filtros: subjectId, status, year
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
router.get(
  "/exam-boards",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const { subjectId, status, year } = req.query;

      let query = firestore.collection("exam_boards").orderBy("examDate", "desc");

      if (subjectId && typeof subjectId === "string") {
        query = query.where("subjectId", "==", subjectId) as any;
      }

      if (status && typeof status === "string") {
        query = query.where("status", "==", status) as any;
      }

      const snapshot = await query.limit(500).get();

      let boards = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          examBoardId: doc.id,
          examBoardCode: String(data.examBoardCode ?? ""),
          subjectId: String(data.subjectId ?? ""),
          examDate: String(data.examDate ?? ""),
          enrollmentOpenAt: String(data.enrollmentOpenAt ?? ""),
          enrollmentCloseAt: String(data.enrollmentCloseAt ?? ""),
          teacherIds: Array.isArray(data.teacherIds) ? data.teacherIds : [],
          requestedBy: String(data.requestedBy ?? ""),
          approvedBy: data.approvedBy ? String(data.approvedBy) : null,
          status: String(data.status ?? "SOLICITADA"),
          notes: data.notes ? String(data.notes) : null,
          createdAt: data.createdAt ?? null,
          updatedAt: data.updatedAt ?? null
        };
      });

      // Filter by year client-side if needed
      if (year && typeof year === "string") {
        boards = boards.filter((board) => board.examDate.startsWith(year));
      }

      res.json({ items: boards, total: boards.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/modulos/profesores/exam-boards
 * Crear mesa examinadora (solicitud de profesor)
 * Estado inicial: SOLICITADA
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
router.post(
  "/exam-boards",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const parsed = CreateExamBoardSchema.parse(req.body);

      // Verify subject exists
      const subjectDoc = await firestore.collection("subjects").doc(parsed.subjectId).get();

      if (!subjectDoc.exists) {
        res.status(404).json({ error: "Materia no encontrada" });
        return;
      }

      // Generate internal code
      const sequence = await getNextSequence("MESA");
      const examBoardCode = generateInternalCode("MESA", sequence);

      // Create exam board
      const newDoc = firestore.collection("exam_boards").doc();

      const examBoardData = {
        examBoardCode,
        subjectId: parsed.subjectId,
        examDate: parsed.examDate,
        enrollmentOpenAt: parsed.enrollmentOpenAt,
        enrollmentCloseAt: parsed.enrollmentCloseAt,
        teacherIds: parsed.teacherIds,
        requestedBy: req.authUser?.uid ?? "",
        approvedBy: null,
        status: "SOLICITADA",
        notes: parsed.notes ?? null,
        createdAt: new Date().toISOString(),
        createdBy: req.authUser?.uid ?? "",
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await newDoc.set(examBoardData);

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: newDoc.id,
        action: "CREATE",
        performedBy: req.authUser?.uid ?? "",
        before: null,
        after: examBoardData,
        reason: `Mesa examinadora creada: ${examBoardCode}`
      });

      res.status(201).json({
        examBoardId: newDoc.id,
        ...examBoardData
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
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/approve
 * Aprobar mesa examinadora (jefe/subjefe)
 * Transición: SOLICITADA -> APROBADA
 */
router.put(
  "/exam-boards/:examBoardId/approve",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const before = boardDoc.data();

      if (before?.status !== "SOLICITADA") {
        res.status(400).json({ error: `No se puede aprobar una mesa en estado ${before?.status}` });
        return;
      }

      const after = {
        ...before,
        status: "APROBADA",
        approvedBy: req.authUser?.uid ?? "",
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("exam_boards").doc(examBoardId).update({
        status: "APROBADA",
        approvedBy: after.approvedBy,
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: examBoardId,
        action: "APPROVE",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Mesa examinadora aprobada por jefatura"
      });

      res.json({ examBoardId, ...after });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/open
 * Abrir mesa para inscripciones (jefe/subjefe)
 * Transición: APROBADA -> ABIERTA
 */
router.put(
  "/exam-boards/:examBoardId/open",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const before = boardDoc.data();

      if (before?.status !== "APROBADA") {
        res.status(400).json({ error: `No se puede abrir una mesa en estado ${before?.status}` });
        return;
      }

      const after = {
        ...before,
        status: "ABIERTA",
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("exam_boards").doc(examBoardId).update({
        status: "ABIERTA",
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: examBoardId,
        action: "OPEN",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Mesa examinadora abierta para inscripciones"
      });

      res.json({ examBoardId, ...after });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/submit
 * Enviar notas para control (profesor)
 * Transición: ABIERTA -> EN_CONTROL
 */
router.put(
  "/exam-boards/:examBoardId/submit",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const before = boardDoc.data();

      if (before?.status !== "ABIERTA") {
        res.status(400).json({ error: `No se puede enviar a control una mesa en estado ${before?.status}` });
        return;
      }

      const after = {
        ...before,
        status: "EN_CONTROL",
        submittedBy: req.authUser?.uid ?? "",
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("exam_boards").doc(examBoardId).update({
        status: "EN_CONTROL",
        submittedBy: after.submittedBy,
        submittedAt: after.submittedAt,
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: examBoardId,
        action: "SUBMIT",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Notas enviadas para control por bedelía"
      });

      res.json({ examBoardId, ...after });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/validate
 * Validar notas contra acta (empleado)
 * Empleado valida que las notas en sistema coinciden con acta papel
 */
router.put(
  "/exam-boards/:examBoardId/validate",
  authenticate,
  authorize("EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const before = boardDoc.data();

      if (before?.status !== "EN_CONTROL") {
        res.status(400).json({ error: `No se puede validar una mesa en estado ${before?.status}` });
        return;
      }

      const after = {
        ...before,
        validatedBy: req.authUser?.uid ?? "",
        validatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("exam_boards").doc(examBoardId).update({
        validatedBy: after.validatedBy,
        validatedAt: after.validatedAt,
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: examBoardId,
        action: "VALIDATE",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Notas validadas contra acta por empleado de bedelía"
      });

      res.json({ examBoardId, ...after });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/close
 * Cerrar mesa definitivamente (jefe/subjefe)
 * Transición: EN_CONTROL -> CERRADA
 * Requiere que la mesa haya sido validada
 */
router.put(
  "/exam-boards/:examBoardId/close",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const before = boardDoc.data();

      if (before?.status !== "EN_CONTROL") {
        res.status(400).json({ error: `No se puede cerrar una mesa en estado ${before?.status}` });
        return;
      }

      if (!before?.validatedBy) {
        res.status(400).json({ error: "La mesa debe estar validada antes de cerrarla" });
        return;
      }

      const after = {
        ...before,
        status: "CERRADA",
        closedBy: req.authUser?.uid ?? "",
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.authUser?.uid ?? ""
      };

      await firestore.collection("exam_boards").doc(examBoardId).update({
        status: "CERRADA",
        closedBy: after.closedBy,
        closedAt: after.closedAt,
        updatedAt: after.updatedAt,
        updatedBy: after.updatedBy
      });

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_board",
        entityId: examBoardId,
        action: "CLOSE",
        performedBy: req.authUser?.uid ?? "",
        before,
        after,
        reason: "Mesa examinadora cerrada definitivamente por jefatura"
      });

      res.json({ examBoardId, ...after });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== ENROLLMENTS ENDPOINTS ====================

/**
 * GET /api/modulos/profesores/exam-boards/:examBoardId/enrollments
 * Listar inscriptos a una mesa
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA, ALUMNO
 */
router.get(
  "/exam-boards/:examBoardId/enrollments",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA", "ALUMNO"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const snapshot = await firestore
        .collection("exam_enrollments")
        .where("examBoardId", "==", examBoardId)
        .orderBy("createdAt", "asc")
        .get();

      const enrollments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          enrollmentId: doc.id,
          examBoardId: String(data.examBoardId ?? ""),
          studentId: String(data.studentId ?? ""),
          eligible: Boolean(data.eligible ?? false),
          eligibilityReasons: Array.isArray(data.eligibilityReasons) ? data.eligibilityReasons : [],
          status: String(data.status ?? "INSCRIPTO"),
          createdAt: data.createdAt ?? null
        };
      });

      res.json({ items: enrollments, total: enrollments.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/modulos/profesores/exam-boards/:examBoardId/enrollments
 * Inscribir alumno a mesa
 * Valida que la mesa esté ABIERTA y dentro del período de inscripción
 * Roles: EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA, ALUMNO
 */
router.post(
  "/exam-boards/:examBoardId/enrollments",
  authenticate,
  authorize("EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA", "ALUMNO"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);
      const parsed = EnrollStudentSchema.parse(req.body);

      // Get exam board
      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const boardData = boardDoc.data();

      // Check if enrollment period is open
      const now = new Date().toISOString();
      const enrollmentOpenAt = String(boardData?.enrollmentOpenAt ?? "");
      const enrollmentCloseAt = String(boardData?.enrollmentCloseAt ?? "");

      if (now < enrollmentOpenAt) {
        res.status(400).json({ error: "El período de inscripción aún no ha comenzado" });
        return;
      }

      if (now > enrollmentCloseAt) {
        res.status(400).json({ error: "El período de inscripción ha finalizado" });
        return;
      }

      if (boardData?.status !== "ABIERTA") {
        res.status(400).json({ error: "La mesa no está abierta para inscripciones" });
        return;
      }

      // Check if student is already enrolled
      const existingSnapshot = await firestore
        .collection("exam_enrollments")
        .where("examBoardId", "==", examBoardId)
        .where("studentId", "==", parsed.studentId)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        res.status(409).json({ error: "El alumno ya está inscripto a esta mesa" });
        return;
      }

      // TODO: Check eligibility (attendance, correlatives, etc.)
      const eligible = true;
      const eligibilityReasons: string[] = [];

      // Create enrollment
      const newDoc = firestore.collection("exam_enrollments").doc();

      const enrollmentData = {
        examBoardId,
        studentId: parsed.studentId,
        eligible,
        eligibilityReasons,
        status: "INSCRIPTO",
        createdAt: new Date().toISOString(),
        createdBy: req.authUser?.uid ?? ""
      };

      await newDoc.set(enrollmentData);

      // Write audit event
      await writeAuditEvent({
        entityType: "exam_enrollment",
        entityId: newDoc.id,
        action: "CREATE",
        performedBy: req.authUser?.uid ?? "",
        before: null,
        after: enrollmentData,
        reason: `Alumno ${parsed.studentId} inscripto a mesa ${examBoardId}`
      });

      res.status(201).json({
        enrollmentId: newDoc.id,
        ...enrollmentData
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

// ==================== GRADES ENDPOINTS ====================

/**
 * GET /api/modulos/profesores/exam-boards/:examBoardId/grades
 * Obtener notas de una mesa
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
router.get(
  "/exam-boards/:examBoardId/grades",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      const snapshot = await firestore
        .collection("exam_records")
        .where("examBoardId", "==", examBoardId)
        .get();

      const records = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          recordId: doc.id,
          examBoardId: String(data.examBoardId ?? ""),
          studentId: String(data.studentId ?? ""),
          grade: data.grade !== undefined ? Number(data.grade) : null,
          absent: Boolean(data.absent ?? false),
          observation: data.observation ? String(data.observation) : null,
          loadedBy: String(data.loadedBy ?? ""),
          loadedAt: data.loadedAt ?? null
        };
      });

      res.json({ items: records, total: records.length });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/modulos/profesores/exam-boards/:examBoardId/grades
 * Cargar/actualizar notas de una mesa
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
router.put(
  "/exam-boards/:examBoardId/grades",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);
      const parsed = LoadGradesSchema.parse(req.body);

      // Verify exam board exists and is in correct status
      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const boardData = boardDoc.data();

      if (boardData?.status !== "ABIERTA" && boardData?.status !== "EN_CONTROL") {
        res.status(400).json({ error: "No se pueden cargar notas en el estado actual de la mesa" });
        return;
      }

      // Process each grade
      const results = [];

      for (const gradeItem of parsed.grades) {
        // Check if record exists
        const existingSnapshot = await firestore
          .collection("exam_records")
          .where("examBoardId", "==", examBoardId)
          .where("studentId", "==", gradeItem.studentId)
          .limit(1)
          .get();

        const recordData = {
          examBoardId,
          studentId: gradeItem.studentId,
          grade: gradeItem.grade ?? null,
          absent: gradeItem.absent ?? false,
          observation: gradeItem.observation ?? null,
          loadedBy: req.authUser?.uid ?? "",
          loadedAt: new Date().toISOString()
        };

        if (existingSnapshot.empty) {
          // Create new record
          const newDoc = firestore.collection("exam_records").doc();
          await newDoc.set(recordData);

          await writeAuditEvent({
            entityType: "exam_record",
            entityId: newDoc.id,
            action: "CREATE",
            performedBy: req.authUser?.uid ?? "",
            before: null,
            after: recordData,
            reason: `Nota cargada para alumno ${gradeItem.studentId}`
          });

          results.push({ recordId: newDoc.id, ...recordData });
        } else {
          // Update existing record
          const existingDoc = existingSnapshot.docs[0];
          const before = existingDoc.data();

          await firestore.collection("exam_records").doc(existingDoc.id).update(recordData);

          await writeAuditEvent({
            entityType: "exam_record",
            entityId: existingDoc.id,
            action: "UPDATE",
            performedBy: req.authUser?.uid ?? "",
            before,
            after: recordData,
            reason: `Nota actualizada para alumno ${gradeItem.studentId}`
          });

          results.push({ recordId: existingDoc.id, ...recordData });
        }
      }

      res.json({ items: results, total: results.length });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Datos inválidos", details: error.errors });
        return;
      }
      next(error);
    }
  }
);

// ==================== PDF GENERATION ====================

/**
 * GET /api/modulos/profesores/exam-boards/:examBoardId/pdf
 * Generar PDF con lista de inscriptos
 * Roles: PROFESOR, EMPLEADO, JEFE_BEDELIA, SUBJEFE_BEDELIA
 */
router.get(
  "/exam-boards/:examBoardId/pdf",
  authenticate,
  authorize("PROFESOR", "EMPLEADO", "JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req, res, next) => {
    try {
      const examBoardId = String(req.params.examBoardId);

      // Get exam board
      const boardDoc = await firestore.collection("exam_boards").doc(examBoardId).get();

      if (!boardDoc.exists) {
        res.status(404).json({ error: "Mesa examinadora no encontrada" });
        return;
      }

      const boardData = boardDoc.data();

      // Get subject name
      const subjectId = String(boardData?.subjectId ?? "");
      const subjectDoc = await firestore.collection("subjects").doc(subjectId).get();
      const subjectName = subjectDoc.exists ? String(subjectDoc.data()?.name ?? subjectId) : subjectId;

      // Get enrollments
      const enrollmentsSnapshot = await firestore
        .collection("exam_enrollments")
        .where("examBoardId", "==", examBoardId)
        .orderBy("createdAt", "asc")
        .get();

      const enrollments = enrollmentsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          enrollmentId: doc.id,
          studentId: String(data.studentId ?? ""),
          eligible: Boolean(data.eligible ?? false),
          status: String(data.status ?? "")
        };
      });

      // Generate PDF
      await generateExamBoardEnrollmentsPDF(
        {
          examBoardCode: String(boardData?.examBoardCode ?? ""),
          subjectName,
          examDate: String(boardData?.examDate ?? ""),
          enrollmentOpenAt: String(boardData?.enrollmentOpenAt ?? ""),
          enrollmentCloseAt: String(boardData?.enrollmentCloseAt ?? ""),
          status: String(boardData?.status ?? ""),
          enrollments
        },
        res
      );
    } catch (error) {
      next(error);
    }
  }
);

export default router;
