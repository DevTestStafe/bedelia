import { Router, Request, Response, NextFunction } from "express";
import { firestore } from "../config/firebase.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import { generateInternalCode } from "../services/code-generator.service.js";
import { writeAuditEvent } from "../services/audit.service.js";
import { generateCertificatePDF } from "../services/certificate-generator.service.js";
import { getNextSequence } from "../services/sequences.service.js";

const router = Router();

// ============================================================================
// CERTIFICATE TEMPLATES - Management (Jefe de Bedelía only)
// ============================================================================

/**
 * GET /certificate-templates
 * List all certificate templates
 */
router.get(
  "/certificate-templates",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA", "EMPLEADO"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templatesSnapshot = await firestore
        .collection("certificate_templates")
        .where("enabled", "==", true)
        .get();

      const templates = templatesSnapshot.docs.map((doc) => ({
        templateId: doc.id,
        ...doc.data()
      }));

      res.json(templates);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /certificate-templates/:templateId
 * Get specific certificate template
 */
router.get(
  "/certificate-templates/:templateId",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA", "EMPLEADO"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const templateId = String(req.params.templateId);

      const templateDoc = await firestore
        .collection("certificate_templates")
        .doc(templateId)
        .get();

      if (!templateDoc.exists) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      res.json({
        templateId: templateDoc.id,
        ...templateDoc.data()
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /certificate-templates
 * Create new certificate template - JEFE only
 */
router.post(
  "/certificate-templates",
  authenticate,
  authorize("JEFE_BEDELIA"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const { name, fields, rules, targetAudience } = req.body;

      if (!name || !fields || !Array.isArray(fields)) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const templateData = {
        name,
        fields,
        rules: rules || [],
        targetAudience: targetAudience || "GENERAL",
        enabled: true,
        configuredBy: authUser.uid,
        createdAt: new Date().toISOString(),
        createdBy: authUser.uid,
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
        version: 1
      };

      const docRef = await firestore
        .collection("certificate_templates")
        .add(templateData);

      await writeAuditEvent({
        entityType: "certificate_template",
        entityId: docRef.id,
        action: "CREATE",
        performedBy: authUser.uid,
        after: templateData,
        reason: `Plantilla de certificado creada: ${name}`
      });

      res.json({
        templateId: docRef.id,
        ...templateData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /certificate-templates/:templateId
 * Update certificate template - JEFE only
 */
router.put(
  "/certificate-templates/:templateId",
  authenticate,
  authorize("JEFE_BEDELIA"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const templateId = String(req.params.templateId);
      const { name, fields, rules, targetAudience, enabled } = req.body;

      const templateRef = firestore
        .collection("certificate_templates")
        .doc(templateId);

      const templateDoc = await templateRef.get();

      if (!templateDoc.exists) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      const before = templateDoc.data();
      const updates: Record<string, unknown> = {};

      if (name !== undefined) updates.name = name;
      if (fields !== undefined) updates.fields = fields;
      if (rules !== undefined) updates.rules = rules;
      if (targetAudience !== undefined) updates.targetAudience = targetAudience;
      if (enabled !== undefined) updates.enabled = enabled;

      updates.updatedAt = new Date().toISOString();
      updates.updatedBy = authUser.uid;
      updates.version = ((before?.version as number) || 0) + 1;

      await templateRef.update(updates);

      await writeAuditEvent({
        entityType: "certificate_template",
        entityId: templateId,
        action: "UPDATE",
        performedBy: authUser.uid,
        before,
        after: { ...before, ...updates },
        reason: "Plantilla de certificado actualizada"
      });

      res.json({
        templateId,
        ...before,
        ...updates
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CERTIFICATE REQUESTS - Submission and Management
// ============================================================================

/**
 * GET /certificates
 * List certificate requests
 */
router.get(
  "/certificates",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const status = req.query.status as string | undefined;
      const studentId = req.query.studentId as string | undefined;

      let query: FirebaseFirestore.Query = firestore.collection("certificates");

      if (authUser.roles?.includes("ALUMNO")) {
        query = query.where("studentId", "==", authUser.uid);
      } else {
        if (studentId) {
          query = query.where("studentId", "==", studentId);
        }
      }

      if (status) {
        query = query.where("status", "==", status);
      }

      const certificatesSnapshot = await query
        .orderBy("createdAt", "desc")
        .get();

      const certificates = await Promise.all(
        certificatesSnapshot.docs.map(async (doc) => {
          const data = doc.data();
          let studentName = "";

          if (data.studentId) {
            const userDoc = await firestore
              .collection("users")
              .doc(data.studentId)
              .get();
            if (userDoc.exists) {
              studentName = (userDoc.data()?.displayName as string) || "";
            }
          }

          return {
            certificateId: doc.id,
            studentName,
            ...data
          };
        })
      );

      res.json(certificates);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /certificates
 * Request new certificate
 */
router.post(
  "/certificates",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const { templateId, studentId, fieldValues } = req.body;

      const actualStudentId = authUser.roles?.includes("ALUMNO")
        ? authUser.uid
        : studentId;

      if (
        authUser.roles?.includes("ALUMNO") &&
        studentId &&
        studentId !== authUser.uid
      ) {
        res
          .status(403)
          .json({ error: "No puedes solicitar certificados para otros alumnos" });
        return;
      }

      if (!templateId || !actualStudentId) {
        res
          .status(400)
          .json({ error: "templateId and studentId are required" });
        return;
      }

      const templateDoc = await firestore
        .collection("certificate_templates")
        .doc(templateId)
        .get();

      if (!templateDoc.exists) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      const sequence = await getNextSequence("CERT");
      const certificateCode = generateInternalCode("CERT", sequence);

      const certificateData = {
        certificateCode,
        templateId,
        studentId: actualStudentId,
        fieldValues: fieldValues || {},
        status: "SOLICITADO",
        requestedBy: authUser.uid,
        requestedAt: new Date().toISOString(),
        approvedBy: null,
        approvedAt: null,
        generatedFileUrl: null,
        createdAt: new Date().toISOString(),
        createdBy: authUser.uid,
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
        version: 1
      };

      const docRef = await firestore
        .collection("certificates")
        .add(certificateData);

      await writeAuditEvent({
        entityType: "certificate",
        entityId: docRef.id,
        action: "CREATE",
        performedBy: authUser.uid,
        after: certificateData,
        reason: `Solicitud de certificado creada: ${certificateCode}`
      });

      res.json({
        certificateId: docRef.id,
        ...certificateData
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /certificates/:certificateId/pdf
 * Generate and download certificate PDF
 */
router.get(
  "/certificates/:certificateId/pdf",
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const certificateId = String(req.params.certificateId);

      const certificateDoc = await firestore
        .collection("certificates")
        .doc(certificateId)
        .get();

      if (!certificateDoc.exists) {
        res.status(404).json({ error: "Certificate not found" });
        return;
      }

      const certData = certificateDoc.data();

      if (
        authUser.roles?.includes("ALUMNO") &&
        certData?.studentId !== authUser.uid
      ) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      if (certData?.status !== "APROBADO") {
        res.status(400).json({ error: "Certificate not approved" });
        return;
      }

      const templateDoc = await firestore
        .collection("certificate_templates")
        .doc(certData?.templateId as string)
        .get();

      if (!templateDoc.exists) {
        res.status(404).json({ error: "Template not found" });
        return;
      }

      const studentDoc = await firestore
        .collection("users")
        .doc(certData?.studentId as string)
        .get();

      const studentName = (studentDoc.data()?.displayName as string) || "Estudiante";
      const template = templateDoc.data();

      const fields = ((template?.fields as Array<{name: string; type: string; label: string}>) || []).map(
        (field) => ({
          name: field.name,
          type: (field.type as "text" | "date" | "number") || "text",
          label: field.label,
          value: String((certData?.fieldValues as Record<string, unknown>)?.[field.name] || "")
        })
      );

      const pdfData = {
        certificateCode: certData?.certificateCode as string,
        certificateType: (template?.name as string) || "Certificado",
        studentName,
        studentId: certData?.studentId as string,
        issueDate: new Date().toLocaleDateString("es-AR"),
        fields,
        rules: (template?.rules as string[]) || []
      };

      await generateCertificatePDF(pdfData, res);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /certificates/:certificateId/approve
 * Approve certificate request
 */
router.put(
  "/certificates/:certificateId/approve",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const certificateId = String(req.params.certificateId);

      const certificateRef = firestore
        .collection("certificates")
        .doc(certificateId);

      const certificateDoc = await certificateRef.get();

      if (!certificateDoc.exists) {
        res.status(404).json({ error: "Certificate not found" });
        return;
      }

      const before = certificateDoc.data();

      const updates = {
        status: "APROBADO",
        approvedBy: authUser.uid,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
        version: ((before?.version as number) || 0) + 1
      };

      await certificateRef.update(updates);

      await writeAuditEvent({
        entityType: "certificate",
        entityId: certificateId,
        action: "APPROVE",
        performedBy: authUser.uid,
        before,
        after: { ...before, ...updates },
        reason: "Certificado aprobado"
      });

      res.json({
        certificateId,
        ...before,
        ...updates
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /certificates/:certificateId/reject
 * Reject certificate request
 */
router.put(
  "/certificates/:certificateId/reject",
  authenticate,
  authorize("JEFE_BEDELIA", "SUBJEFE_BEDELIA"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = req.authUser!;
      const certificateId = String(req.params.certificateId);
      const { reason } = req.body;

      const certificateRef = firestore
        .collection("certificates")
        .doc(certificateId);

      const certificateDoc = await certificateRef.get();

      if (!certificateDoc.exists) {
        res.status(404).json({ error: "Certificate not found" });
        return;
      }

      const before = certificateDoc.data();

      const updates = {
        status: "RECHAZADO",
        rejectedBy: authUser.uid,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason || "",
        updatedAt: new Date().toISOString(),
        updatedBy: authUser.uid,
        version: ((before?.version as number) || 0) + 1
      };

      await certificateRef.update(updates);

      await writeAuditEvent({
        entityType: "certificate",
        entityId: certificateId,
        action: "REJECT",
        performedBy: authUser.uid,
        before,
        after: { ...before, ...updates },
        reason: `Certificado rechazado: ${reason || ""}`
      });

      res.json({
        certificateId,
        ...before,
        ...updates
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
