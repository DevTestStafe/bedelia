export async function fetchCurrentUser(token: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el usuario desde la API");
  }

  return response.json() as Promise<{ user: { uid: string; username: string; roles: string[] } }>;
}

export type LegajoItem = {
  legajoId: string;
  legajoCode: string;
  studentId: string;
  documentationStatus: string;
  careerEnrollmentStatus: string;
  createdAt: string | null;
};

export type CreateLegajoInput = {
  studentId: string;
  documentationStatus: "INCOMPLETA" | "EN_REVISION" | "COMPLETA";
  careerEnrollmentStatus: "PENDIENTE" | "APROBADA" | "RECHAZADA";
};

export type UpdateLegajoInput = {
  studentId?: string;
  documentationStatus?: "INCOMPLETA" | "EN_REVISION" | "COMPLETA";
  careerEnrollmentStatus?: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  reason?: string;
};

export type AuditEventItem = {
  auditId: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "CLOSE";
  performedBy: string;
  performedAt: string;
  reason?: string;
  sourceModule?: string;
};

export type AnnualEnrollmentItem = {
  enrollmentId: string;
  legajoId: string;
  studentId: string;
  year: number;
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  validationSummary: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateAnnualEnrollmentInput = {
  legajoId: string;
  year: number;
};

export type UpdateAnnualEnrollmentInput = {
  status: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  reason?: string;
};

export async function fetchLegajos(token: string, codeFilter?: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (codeFilter?.trim()) {
    search.set("code", codeFilter.trim().toUpperCase());
  }

  const url = `${apiUrl}/api/modulos/empleados/legajos${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener legajos");
  }

  return response.json() as Promise<{ count: number; items: LegajoItem[] }>;
}

export async function createLegajo(token: string, input: CreateLegajoInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/empleados/legajos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No se pudo crear el legajo");
  }

  return response.json() as Promise<LegajoItem>;
}

export async function updateLegajo(token: string, legajoId: string, input: UpdateLegajoInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/empleados/legajos/${legajoId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar el legajo");
  }

  return response.json() as Promise<LegajoItem>;
}

export async function fetchLegajoAudit(token: string, legajoId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/empleados/legajos/${legajoId}/auditoria`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener la auditoría del legajo");
  }

  return response.json() as Promise<{ count: number; items: AuditEventItem[] }>;
}

export async function fetchAnnualEnrollments(token: string, year?: number, status?: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (year) {
    search.set("year", String(year));
  }

  if (status) {
    search.set("status", status);
  }

  const url = `${apiUrl}/api/modulos/empleados/inscripciones-anuales${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener inscripciones anuales");
  }

  return response.json() as Promise<{ count: number; items: AnnualEnrollmentItem[] }>;
}

export async function createAnnualEnrollment(token: string, input: CreateAnnualEnrollmentInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/empleados/inscripciones-anuales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.reason ?? errorBody.message ?? "No se pudo crear inscripción anual");
  }

  return response.json() as Promise<AnnualEnrollmentItem>;
}

export async function updateAnnualEnrollment(token: string, enrollmentId: string, input: UpdateAnnualEnrollmentInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/empleados/inscripciones-anuales/${enrollmentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No se pudo actualizar inscripción anual");
  }

  return response.json() as Promise<AnnualEnrollmentItem>;
}

// ========== Materias y Comisiones ==========

export type SubjectItem = {
  subjectId: string;
  careerId: string;
  name: string;
  year: number;
  createdAt: string | null;
};

export type CommissionItem = {
  commissionId: string;
  subjectId: string;
  name: string;
  teacherId: string | null;
  createdAt: string | null;
};

export type SubjectEnrollmentItem = {
  enrollmentId: string;
  studentId: string;
  subjectId: string;
  commissionId: string | null;
  year: number;
  status: string;
  createdAt: string | null;
};

export type CreateSubjectInput = {
  careerId: string;
  name: string;
  year: number;
};

export type CreateCommissionInput = {
  subjectId: string;
  name: string;
  teacherId?: string;
};

export type CreateSubjectEnrollmentInput = {
  studentId: string;
  subjectId: string;
  commissionId?: string;
  year: number;
};

export async function fetchSubjects(token: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/materias/materias`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las materias");
  }

  return response.json() as Promise<{ count: number; items: SubjectItem[] }>;
}

export async function createSubject(token: string, input: CreateSubjectInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/materias/materias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No se pudo crear la materia");
  }

  return response.json() as Promise<SubjectItem>;
}

export async function fetchCommissions(token: string, subjectId?: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (subjectId) {
    search.set("subjectId", subjectId);
  }

  const url = `${apiUrl}/api/modulos/materias/comisiones${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las comisiones");
  }

  return response.json() as Promise<{ count: number; items: CommissionItem[] }>;
}

export async function createCommission(token: string, input: CreateCommissionInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/materias/comisiones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("No se pudo crear la comisión");
  }

  return response.json() as Promise<CommissionItem>;
}

export async function createSubjectEnrollment(token: string, input: CreateSubjectEnrollmentInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/materias/inscripciones-materias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.reason ?? errorBody.message ?? "No se pudo crear inscripción a materia");
  }

  return response.json() as Promise<SubjectEnrollmentItem>;
}

export async function fetchSubjectEnrollments(token: string, studentId?: string, year?: number) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (studentId) {
    search.set("studentId", studentId);
  }

  if (year) {
    search.set("year", String(year));
  }

  const url = `${apiUrl}/api/modulos/materias/inscripciones-materias${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener inscripciones a materias");
  }

  return response.json() as Promise<{ count: number; items: SubjectEnrollmentItem[] }>;
}

// ==================== ATTENDANCE ====================

export type AttendanceItemInput = {
  studentId: string;
  present: boolean;
  justification?: string;
};

export type AttendanceItem = {
  attendanceId: string;
  subjectId: string;
  commissionId: string;
  classDate: string;
  teacherId: string;
  items: Array<{
    studentId: string;
    present: boolean;
    justification?: string;
  }>;
  createdAt: string | null;
  createdBy: string;
};

export type CreateAttendanceInput = {
  subjectId: string;
  commissionId: string;
  classDate: string; // ISO 8601 date string (YYYY-MM-DD)
  items: AttendanceItemInput[];
};

export type AttendanceSummary = {
  studentId: string;
  summary: Array<{
    subjectId: string;
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    justifiedCount: number;
    attendancePercentage: number;
  }>;
};

export async function fetchAttendance(
  token: string,
  filters?: { commissionId?: string; subjectId?: string; studentId?: string; startDate?: string; endDate?: string }
) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (filters?.commissionId) {
    search.set("commissionId", filters.commissionId);
  }

  if (filters?.subjectId) {
    search.set("subjectId", filters.subjectId);
  }

  if (filters?.studentId) {
    search.set("studentId", filters.studentId);
  }

  if (filters?.startDate) {
    search.set("startDate", filters.startDate);
  }

  if (filters?.endDate) {
    search.set("endDate", filters.endDate);
  }

  const url = `${apiUrl}/api/modulos/profesores/attendance${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener registros de asistencia");
  }

  return response.json() as Promise<{ items: AttendanceItem[]; total: number }>;
}

export async function fetchAttendanceSummary(token: string, studentId: string, subjectId?: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  search.set("studentId", studentId);

  if (subjectId) {
    search.set("subjectId", subjectId);
  }

  const url = `${apiUrl}/api/modulos/profesores/attendance/summary?${search}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudo obtener el resumen de asistencias");
  }

  return response.json() as Promise<AttendanceSummary>;
}

export async function createAttendance(token: string, input: CreateAttendanceInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo registrar la asistencia");
  }

  return response.json() as Promise<AttendanceItem>;
}

export async function updateAttendance(token: string, attendanceId: string, items: AttendanceItemInput[]) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/attendance/${attendanceId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo actualizar la asistencia");
  }

  return response.json() as Promise<AttendanceItem>;
}

// ==================== EXAM BOARDS ====================

export type ExamBoardItem = {
  examBoardId: string;
  examBoardCode: string;
  subjectId: string;
  examDate: string;
  enrollmentOpenAt: string;
  enrollmentCloseAt: string;
  teacherIds: string[];
  requestedBy: string;
  approvedBy: string | null;
  status: string; // SOLICITADA, APROBADA, ABIERTA, EN_CONTROL, CERRADA
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateExamBoardInput = {
  subjectId: string;
  examDate: string; // ISO 8601 date
  enrollmentOpenAt: string; // ISO 8601 datetime
  enrollmentCloseAt: string; // ISO 8601 datetime
  teacherIds: string[];
  notes?: string;
};

export type ExamEnrollmentItem = {
  enrollmentId: string;
  examBoardId: string;
  studentId: string;
  eligible: boolean;
  eligibilityReasons: string[];
  status: string;
  createdAt: string | null;
};

export type ExamRecordItem = {
  recordId: string;
  examBoardId: string;
  studentId: string;
  grade: number | null;
  absent: boolean;
  observation: string | null;
  loadedBy: string;
  loadedAt: string | null;
};

export type GradeInput = {
  studentId: string;
  grade?: number;
  absent?: boolean;
  observation?: string;
};

export async function fetchExamBoards(
  token: string,
  filters?: { subjectId?: string; status?: string; year?: string }
) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (filters?.subjectId) {
    search.set("subjectId", filters.subjectId);
  }

  if (filters?.status) {
    search.set("status", filters.status);
  }

  if (filters?.year) {
    search.set("year", filters.year);
  }

  const url = `${apiUrl}/api/modulos/profesores/exam-boards${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las mesas examinadoras");
  }

  return response.json() as Promise<{ items: ExamBoardItem[]; total: number }>;
}

export async function createExamBoard(token: string, input: CreateExamBoardInput) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo crear la mesa examinadora");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function approveExamBoard(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/approve`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo aprobar la mesa");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function openExamBoard(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/open`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo abrir la mesa");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function submitExamBoard(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/submit`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo enviar la mesa a control");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function validateExamBoard(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/validate`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo validar la mesa");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function closeExamBoard(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/close`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo cerrar la mesa");
  }

  return response.json() as Promise<ExamBoardItem>;
}

export async function fetchExamEnrollments(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/enrollments`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener los inscriptos");
  }

  return response.json() as Promise<{ items: ExamEnrollmentItem[]; total: number }>;
}

export async function enrollStudentToExamBoard(token: string, examBoardId: string, studentId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/enrollments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ studentId })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo inscribir al alumno");
  }

  return response.json() as Promise<ExamEnrollmentItem>;
}

export async function fetchExamGrades(token: string, examBoardId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/grades`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las notas");
  }

  return response.json() as Promise<{ items: ExamRecordItem[]; total: number }>;
}

export async function loadExamGrades(token: string, examBoardId: string, grades: GradeInput[]) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/profesores/exam-boards/${examBoardId}/grades`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ grades })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudieron cargar las notas");
  }

  return response.json() as Promise<{ items: ExamRecordItem[]; total: number }>;
}

// ============================================================================
// CERTIFICATES API
// ============================================================================

export type CertificateTemplateField = {
  name: string;
  type: "text" | "date" | "number";
  label: string;
};

export type CertificateTemplate = {
  templateId: string;
  name: string;
  fields: CertificateTemplateField[];
  rules: string[];
  targetAudience: string;
  enabled: boolean;
  configuredBy: string;
  createdAt: string;
};

export type CertificateRequest = {
  certificateId: string;
  certificateCode: string;
  templateId: string;
  studentId: string;
  studentName: string;
  fieldValues: Record<string, unknown>;
  status: "SOLICITADO" | "APROBADO" | "RECHAZADO";
  requestedBy: string;
  requestedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason?: string;
};

export async function fetchCertificateTemplates(token: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/jefatura/certificate-templates`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las plantillas de certificados");
  }

  return response.json() as Promise<CertificateTemplate[]>;
}

export async function createCertificateTemplate(
  token: string,
  name: string,
  fields: CertificateTemplateField[],
  rules: string[],
  targetAudience: string
) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/jefatura/certificate-templates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name, fields, rules, targetAudience })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo crear la plantilla");
  }

  return response.json() as Promise<CertificateTemplate>;
}

export async function fetchCertificateRequests(token: string, filters?: { status?: string; studentId?: string }) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const search = new URLSearchParams();

  if (filters?.status) {
    search.set("status", filters.status);
  }
  if (filters?.studentId) {
    search.set("studentId", filters.studentId);
  }

  const url = `${apiUrl}/api/modulos/jefatura/certificates${search.toString() ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("No se pudieron obtener las solicitudes de certificados");
  }

  return response.json() as Promise<CertificateRequest[]>;
}

export async function requestCertificate(
  token: string,
  templateId: string,
  studentId: string | null,
  fieldValues: Record<string, unknown>
) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/jefatura/certificates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ templateId, studentId, fieldValues })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo crear la solicitud");
  }

  return response.json() as Promise<CertificateRequest>;
}

export async function approveCertificate(token: string, certificateId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/jefatura/certificates/${certificateId}/approve`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo aprobar el certificado");
  }

  return response.json() as Promise<CertificateRequest>;
}

export async function rejectCertificate(token: string, certificateId: string, reason: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  const response = await fetch(`${apiUrl}/api/modulos/jefatura/certificates/${certificateId}/reject`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error ?? "No se pudo rechazar el certificado");
  }

  return response.json() as Promise<CertificateRequest>;
}

export function downloadCertificatePDF(_token: string, certificateId: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
  // Note: Token is handled via Firebase Auth in the request
  window.open(`${apiUrl}/api/modulos/jefatura/certificates/${certificateId}/pdf`, "_blank");
}
