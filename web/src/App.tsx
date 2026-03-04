import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import {
  approveExamBoard,
  closeExamBoard,
  createAnnualEnrollment,
  createAttendance,
  createCommission,
  createExamBoard,
  createLegajo,
  createSubject,
  createSubjectEnrollment,
  enrollStudentToExamBoard,
  fetchAnnualEnrollments,
  fetchAttendance,
  fetchCommissions,
  fetchCurrentUser,
  fetchExamBoards,
  fetchExamEnrollments,
  fetchExamGrades,
  fetchLegajoAudit,
  fetchLegajos,
  fetchSubjectEnrollments,
  fetchSubjects,
  loadExamGrades,
  openExamBoard,
  submitExamBoard,
  updateAnnualEnrollment,
  updateLegajo,
  validateExamBoard,
  fetchCertificateTemplates,
  createCertificateTemplate,
  fetchCertificateRequests,
  requestCertificate,
  approveCertificate,
  rejectCertificate,
  downloadCertificatePDF
} from "./lib/api";
import type {
  AnnualEnrollmentItem,
  AttendanceItem,
  AttendanceItemInput,
  AuditEventItem,
  CommissionItem,
  ExamBoardItem,
  ExamEnrollmentItem,
  ExamRecordItem,
  GradeInput,
  LegajoItem,
  SubjectEnrollmentItem,
  SubjectItem,
  CertificateTemplate,
  CertificateRequest,
  CertificateTemplateField
} from "./lib/api";
import { firebaseAuth, firebaseInitError } from "./lib/firebase";

type ApiUser = {
  uid: string;
  username: string;
  roles: string[];
};

const roleLabels: Record<string, string> = {
  JEFE_BEDELIA: "Jefe de Bedelía",
  SUBJEFE_BEDELIA: "Sub-Jefe de Bedelía",
  EMPLEADO: "Empleado",
  PROFESOR: "Profesor",
  ALUMNO: "Alumno"
};

const moduleByRole: Record<string, string> = {
  JEFE_BEDELIA: "Módulo Jefatura",
  SUBJEFE_BEDELIA: "Módulo Jefatura",
  EMPLEADO: "Módulo Empleados",
  PROFESOR: "Módulo Profesores",
  ALUMNO: "Módulo Alumnos"
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [idToken, setIdToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [legajoCodeFilter, setLegajoCodeFilter] = useState("");
  const [legajos, setLegajos] = useState<LegajoItem[]>([]);
  const [legajosLoading, setLegajosLoading] = useState(false);
  const [legajosError, setLegajosError] = useState("");
  const [newStudentId, setNewStudentId] = useState("");
  const [newDocumentationStatus, setNewDocumentationStatus] = useState<"INCOMPLETA" | "EN_REVISION" | "COMPLETA">("INCOMPLETA");
  const [newCareerEnrollmentStatus, setNewCareerEnrollmentStatus] = useState<"PENDIENTE" | "APROBADA" | "RECHAZADA">("PENDIENTE");
  const [creatingLegajo, setCreatingLegajo] = useState(false);
  const [createLegajoError, setCreateLegajoError] = useState("");
  const [createLegajoSuccess, setCreateLegajoSuccess] = useState("");
  const [selectedLegajo, setSelectedLegajo] = useState<LegajoItem | null>(null);
  const [editStudentId, setEditStudentId] = useState("");
  const [editDocumentationStatus, setEditDocumentationStatus] = useState<"INCOMPLETA" | "EN_REVISION" | "COMPLETA">("INCOMPLETA");
  const [editCareerEnrollmentStatus, setEditCareerEnrollmentStatus] = useState<"PENDIENTE" | "APROBADA" | "RECHAZADA">("PENDIENTE");
  const [editReason, setEditReason] = useState("Corrección de datos");
  const [updatingLegajo, setUpdatingLegajo] = useState(false);
  const [updateLegajoError, setUpdateLegajoError] = useState("");
  const [updateLegajoSuccess, setUpdateLegajoSuccess] = useState("");
  const [auditEvents, setAuditEvents] = useState<AuditEventItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [enrollmentYear, setEnrollmentYear] = useState(new Date().getFullYear());
  const [enrollmentLegajoId, setEnrollmentLegajoId] = useState("");
  const [enrollments, setEnrollments] = useState<AnnualEnrollmentItem[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentsError, setEnrollmentsError] = useState("");
  const [creatingEnrollment, setCreatingEnrollment] = useState(false);
  const [createEnrollmentError, setCreateEnrollmentError] = useState("");
  const [createEnrollmentSuccess, setCreateEnrollmentSuccess] = useState("");
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectYear, setNewSubjectYear] = useState(1);
  const [newSubjectCareer, setNewSubjectCareer] = useState("default-career");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [createSubjectError, setCreateSubjectError] = useState("");
  const [createSubjectSuccess, setCreateSubjectSuccess] = useState("");
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [commissionsError, setCommissionsError] = useState("");
  const [newCommissionName, setNewCommissionName] = useState("");
  const [newCommissionSubjectId, setNewCommissionSubjectId] = useState("");
  const [creatingCommission, setCreatingCommission] = useState(false);
  const [createCommissionError, setCreateCommissionError] = useState("");
  const [createCommissionSuccess, setCreateCommissionSuccess] = useState("");
  const [subjectEnrollments, setSubjectEnrollments] = useState<SubjectEnrollmentItem[]>([]);
  const [subjectEnrollmentsLoading, setSubjectEnrollmentsLoading] = useState(false);
  const [subjectEnrollmentsError, setSubjectEnrollmentsError] = useState("");
  const [enrollSubjectStudentId, setEnrollSubjectStudentId] = useState("");
  const [enrollSubjectId, setEnrollSubjectId] = useState("");
  const [enrollSubjectYear, setEnrollSubjectYear] = useState(new Date().getFullYear());
  const [creatingSubjectEnrollment, setCreatingSubjectEnrollment] = useState(false);
  const [createSubjectEnrollmentError, setCreateSubjectEnrollmentError] = useState("");
  const [createSubjectEnrollmentSuccess, setCreateSubjectEnrollmentSuccess] = useState("");

  // Attendance state
  const [attendances, setAttendances] = useState<AttendanceItem[]>([]);
  const [attendancesLoading, setAttendancesLoading] = useState(false);
  const [attendancesError, setAttendancesError] = useState("");
  const [attendanceCommissionId, setAttendanceCommissionId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceItems, setAttendanceItems] = useState<AttendanceItemInput[]>([]);
  const [creatingAttendance, setCreatingAttendance] = useState(false);
  const [createAttendanceError, setCreateAttendanceError] = useState("");
  const [createAttendanceSuccess, setCreateAttendanceSuccess] = useState("");

  // Exam boards state
  const [examBoards, setExamBoards] = useState<ExamBoardItem[]>([]);
  const [examBoardsLoading, setExamBoardsLoading] = useState(false);
  const [examBoardsError, setExamBoardsError] = useState("");
  const [newExamBoardSubjectId, setNewExamBoardSubjectId] = useState("");
  const [newExamBoardDate, setNewExamBoardDate] = useState("");
  const [newExamBoardEnrollmentOpen, setNewExamBoardEnrollmentOpen] = useState("");
  const [newExamBoardEnrollmentClose, setNewExamBoardEnrollmentClose] = useState("");
  const [newExamBoardTeacher, setNewExamBoardTeacher] = useState("");
  const [newExamBoardNotes, setNewExamBoardNotes] = useState("");
  const [creatingExamBoard, setCreatingExamBoard] = useState(false);
  const [createExamBoardError, setCreateExamBoardError] = useState("");
  const [createExamBoardSuccess, setCreateExamBoardSuccess] = useState("");
  const [selectedExamBoard, setSelectedExamBoard] = useState<ExamBoardItem | null>(null);
  const [examEnrollments, setExamEnrollments] = useState<ExamEnrollmentItem[]>([]);
  const [examGrades, setExamGrades] = useState<ExamRecordItem[]>([]);
  const [enrollingStudent, setEnrollingStudent] = useState(false);
  const [enrollStudentError, setEnrollStudentError] = useState("");
  const [enrollStudentSuccess, setEnrollStudentSuccess] = useState("");
  const [gradeInputs, setGradeInputs] = useState<GradeInput[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadGradesError, setLoadGradesError] = useState("");
  const [loadGradesSuccess, setLoadGradesSuccess] = useState("");

  // Certificates state
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplate[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [certificatesError, setCertificatesError] = useState("");
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateFields, setNewTemplateFields] = useState<CertificateTemplateField[]>([{ name: "", type: "text", label: "" }]);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [createTemplateError, setCreateTemplateError] = useState("");
  const [createTemplateSuccess, setCreateTemplateSuccess] = useState("");
  const [requestingCertificate, setRequestingCertificate] = useState(false);
  const [requestCertificateTemplate, setRequestCertificateTemplate] = useState("");
  const [requestCertificateStudent, setRequestCertificateStudent] = useState("");

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setFirebaseUser(nextUser);
      setError("");

      if (!nextUser) {
        setApiUser(null);
        setLoading(false);
        return;
      }

      try {
        const token = await nextUser.getIdToken();
        setIdToken(token);
        const result = await fetchCurrentUser(token);
        setApiUser(result.user);
      } catch {
        setIdToken("");
        setApiUser(null);
        setError("No se pudo cargar los roles desde la API");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (firebaseInitError) {
    return (
      <main className="container">
        <section className="card">
          <h1>Bedelía ISEF</h1>
          <p className="error">Error de configuración Firebase: {firebaseInitError}</p>
        </section>
      </main>
    );
  }

  const loadLegajos = useCallback(async () => {
    if (!idToken || !apiUser?.roles.includes("EMPLEADO")) {
      setLegajos([]);
      return;
    }

    try {
      setLegajosLoading(true);
      setLegajosError("");
      const result = await fetchLegajos(idToken, legajoCodeFilter);
      setLegajos(result.items);
    } catch {
      setLegajosError("No se pudieron cargar los legajos");
    } finally {
      setLegajosLoading(false);
    }
  }, [apiUser?.roles, idToken, legajoCodeFilter]);

  const isLegajoManager = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return roles.includes("EMPLEADO") || roles.includes("JEFE_BEDELIA") || roles.includes("SUBJEFE_BEDELIA");
  }, [apiUser?.roles]);

  const isCertificateManager = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return roles.includes("JEFE_BEDELIA") || roles.includes("SUBJEFE_BEDELIA") || roles.includes("EMPLEADO");
  }, [apiUser?.roles]);

  const isStudent = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return roles.includes("ALUMNO");
  }, [apiUser?.roles]);

  const loadLegajoAudit = useCallback(
    async (legajoId: string) => {
      if (!idToken) {
        return;
      }

      try {
        setAuditLoading(true);
        setAuditError("");
        const result = await fetchLegajoAudit(idToken, legajoId);
        setAuditEvents(result.items);
      } catch {
        setAuditError("No se pudo cargar la auditoría del legajo");
      } finally {
        setAuditLoading(false);
      }
    },
    [idToken]
  );

  const loadEnrollments = useCallback(async () => {
    if (!idToken || !isLegajoManager) {
      setEnrollments([]);
      return;
    }

    try {
      setEnrollmentsLoading(true);
      setEnrollmentsError("");
      const result = await fetchAnnualEnrollments(idToken, enrollmentYear);
      setEnrollments(result.items);
    } catch {
      setEnrollmentsError("No se pudieron cargar las inscripciones");
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [idToken, isLegajoManager, enrollmentYear]);

  const loadSubjects = useCallback(async () => {
    if (!idToken || !isLegajoManager) {
      setSubjects([]);
      return;
    }

    try {
      setSubjectsLoading(true);
      setSubjectsError("");
      const result = await fetchSubjects(idToken);
      setSubjects(result.items);
    } catch {
      setSubjectsError("No se pudieron cargar las materias");
    } finally {
      setSubjectsLoading(false);
    }
  }, [idToken, isLegajoManager]);

  const loadCommissions = useCallback(async () => {
    if (!idToken || !isLegajoManager) {
      setCommissions([]);
      return;
    }

    try {
      setCommissionsLoading(true);
      setCommissionsError("");
      const result = await fetchCommissions(idToken);
      setCommissions(result.items);
    } catch {
      setCommissionsError("No se pudieron cargar las comisiones");
    } finally {
      setCommissionsLoading(false);
    }
  }, [idToken, isLegajoManager]);

  const loadSubjectEnrollments = useCallback(async () => {
    if (!idToken || !isLegajoManager) {
      setSubjectEnrollments([]);
      return;
    }

    try {
      setSubjectEnrollmentsLoading(true);
      setSubjectEnrollmentsError("");
      const result = await fetchSubjectEnrollments(idToken, undefined, enrollSubjectYear);
      setSubjectEnrollments(result.items);
    } catch {
      setSubjectEnrollmentsError("No se pudieron cargar las inscripciones a materias");
    } finally {
      setSubjectEnrollmentsLoading(false);
    }
  }, [idToken, isLegajoManager, enrollSubjectYear]);

  const isProfesor = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return roles.includes("PROFESOR") || roles.includes("JEFE_BEDELIA") || roles.includes("SUBJEFE_BEDELIA") || roles.includes("EMPLEADO");
  }, [apiUser?.roles]);

  const loadAttendances = useCallback(async () => {
    if (!idToken || !isProfesor) {
      setAttendances([]);
      return;
    }

    try {
      setAttendancesLoading(true);
      setAttendancesError("");
      const filters = attendanceCommissionId ? { commissionId: attendanceCommissionId } : undefined;
      const result = await fetchAttendance(idToken, filters);
      setAttendances(result.items);
    } catch {
      setAttendancesError("No se pudieron cargar las asistencias");
    } finally {
      setAttendancesLoading(false);
    }
  }, [idToken, isProfesor, attendanceCommissionId]);

  const loadExamBoards = useCallback(async () => {
    if (!idToken || !isProfesor) {
      setExamBoards([]);
      return;
    }

    try {
      setExamBoardsLoading(true);
      setExamBoardsError("");
      const result = await fetchExamBoards(idToken);
      setExamBoards(result.items);
    } catch {
      setExamBoardsError("No se pudieron cargar las mesas examinadoras");
    } finally {
      setExamBoardsLoading(false);
    }
  }, [idToken, isProfesor]);

  useEffect(() => {
    loadLegajos();
  }, [loadLegajos]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadCommissions();
  }, [loadCommissions]);

  useEffect(() => {
    loadSubjectEnrollments();
  }, [loadSubjectEnrollments]);

  const loadCertificates = useCallback(async () => {
    if (!idToken || !isCertificateManager) return;
    try {
      setCertificatesLoading(true);
      setCertificatesError("");
      const [templates, requests] = await Promise.all([
        fetchCertificateTemplates(idToken),
        fetchCertificateRequests(idToken)
      ]);
      setCertificateTemplates(templates);
      setCertificateRequests(requests);
    } catch (err) {
      setCertificatesError(err instanceof Error ? err.message : "Error cargando certificados");
    } finally {
      setCertificatesLoading(false);
    }
  }, [idToken, isCertificateManager]);

  useEffect(() => {
    if (isCertificateManager) {
      loadCertificates();
    }
  }, [isCertificateManager, loadCertificates]);

  useEffect(() => {
    loadAttendances();
  }, [loadAttendances]);

  useEffect(() => {
    loadExamBoards();
  }, [loadExamBoards]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!firebaseAuth) {
      setError("Firebase no está inicializado en este entorno");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      setPassword("");
    } catch {
      setLoading(false);
      setError("Usuario o contraseña incorrectos");
    }
  }

  async function handleLogout() {
    if (!firebaseAuth) {
      return;
    }

    setError("");
    setIdToken("");
    setLegajos([]);
    setSelectedLegajo(null);
    setAuditEvents([]);
    await signOut(firebaseAuth);
    setApiUser(null);
  }

  async function handleCreateLegajo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateLegajoError("Sesión inválida para crear legajo");
      return;
    }

    try {
      setCreatingLegajo(true);
      setCreateLegajoError("");
      setCreateLegajoSuccess("");

      const created = await createLegajo(idToken, {
        studentId: newStudentId.trim(),
        documentationStatus: newDocumentationStatus,
        careerEnrollmentStatus: newCareerEnrollmentStatus
      });

      setCreateLegajoSuccess(`Legajo creado: ${created.legajoCode}`);
      setNewStudentId("");
      setLegajoCodeFilter(created.legajoCode);
      await loadLegajos();
    } catch {
      setCreateLegajoError("No se pudo crear el legajo");
    } finally {
      setCreatingLegajo(false);
    }
  }

  function handleSelectLegajo(item: LegajoItem) {
    setSelectedLegajo(item);
    setEditStudentId(item.studentId);
    setEditDocumentationStatus(item.documentationStatus as "INCOMPLETA" | "EN_REVISION" | "COMPLETA");
    setEditCareerEnrollmentStatus(item.careerEnrollmentStatus as "PENDIENTE" | "APROBADA" | "RECHAZADA");
    setUpdateLegajoError("");
    setUpdateLegajoSuccess("");
    loadLegajoAudit(item.legajoId);
  }

  async function handleUpdateLegajo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken || !selectedLegajo) {
      setUpdateLegajoError("Selecciona un legajo para editar");
      return;
    }

    try {
      setUpdatingLegajo(true);
      setUpdateLegajoError("");
      setUpdateLegajoSuccess("");

      await updateLegajo(idToken, selectedLegajo.legajoId, {
        studentId: editStudentId.trim(),
        documentationStatus: editDocumentationStatus,
        careerEnrollmentStatus: editCareerEnrollmentStatus,
        reason: editReason.trim()
      });

      setUpdateLegajoSuccess("Legajo actualizado correctamente");
      await loadLegajos();
      await loadLegajoAudit(selectedLegajo.legajoId);
    } catch {
      setUpdateLegajoError("No se pudo actualizar el legajo");
    } finally {
      setUpdatingLegajo(false);
    }
  }

  async function handleCreateEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateEnrollmentError("Sesión inválida");
      return;
    }

    try {
      setCreatingEnrollment(true);
      setCreateEnrollmentError("");
      setCreateEnrollmentSuccess("");

      await createAnnualEnrollment(idToken, {
        legajoId: enrollmentLegajoId.trim(),
        year: enrollmentYear
      });

      setCreateEnrollmentSuccess(`Inscripción creada para el año ${enrollmentYear}`);
      setEnrollmentLegajoId("");
      await loadEnrollments();
    } catch (err) {
      setCreateEnrollmentError(err instanceof Error ? err.message : "No se pudo crear inscripción");
    } finally {
      setCreatingEnrollment(false);
    }
  }

  async function handleApproveEnrollment(enrollmentId: string) {
    if (!idToken) return;

    try {
      await updateAnnualEnrollment(idToken, enrollmentId, {
        status: "APROBADA",
        reason: "Aprobada por jefe/subjefe de bedelía"
      });
      await loadEnrollments();
    } catch {
      setEnrollmentsError("No se pudo aprobar la inscripción");
    }
  }

  async function handleRejectEnrollment(enrollmentId: string) {
    if (!idToken) return;

    try {
      await updateAnnualEnrollment(idToken, enrollmentId, {
        status: "RECHAZADA",
        reason: "Rechazada por jefe/subjefe de bedelía"
      });
      await loadEnrollments();
    } catch {
      setEnrollmentsError("No se pudo rechazar la inscripción");
    }
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateSubjectError("Sesión inválida");
      return;
    }

    try {
      setCreatingSubject(true);
      setCreateSubjectError("");
      setCreateSubjectSuccess("");

      await createSubject(idToken, {
        careerId: newSubjectCareer,
        name: newSubjectName.trim(),
        year: newSubjectYear
      });

      setCreateSubjectSuccess("Materia creada correctamente");
      setNewSubjectName("");
      await loadSubjects();
    } catch {
      setCreateSubjectError("No se pudo crear la materia");
    } finally {
      setCreatingSubject(false);
    }
  }

  async function handleCreateCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateCommissionError("Sesión inválida");
      return;
    }

    try {
      setCreatingCommission(true);
      setCreateCommissionError("");
      setCreateCommissionSuccess("");

      await createCommission(idToken, {
        subjectId: newCommissionSubjectId,
        name: newCommissionName.trim()
      });

      setCreateCommissionSuccess("Comisión creada correctamente");
      setNewCommissionName("");
      await loadCommissions();
    } catch {
      setCreateCommissionError("No se pudo crear la comisión");
    } finally {
      setCreatingCommission(false);
    }
  }

  async function handleCreateSubjectEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateSubjectEnrollmentError("Sesión inválida");
      return;
    }

    try {
      setCreatingSubjectEnrollment(true);
      setCreateSubjectEnrollmentError("");
      setCreateSubjectEnrollmentSuccess("");

      await createSubjectEnrollment(idToken, {
        studentId: enrollSubjectStudentId.trim(),
        subjectId: enrollSubjectId,
        year: enrollSubjectYear
      });

      setCreateSubjectEnrollmentSuccess("Alumno inscripto a materia correctamente");
      setEnrollSubjectStudentId("");
      await loadSubjectEnrollments();
    } catch (err) {
      setCreateSubjectEnrollmentError(err instanceof Error ? err.message : "No se pudo inscribir a materia");
    } finally {
      setCreatingSubjectEnrollment(false);
    }
  }

  async function handleCreateAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateAttendanceError("Sesión inválida");
      return;
    }

    if (!attendanceCommissionId) {
      setCreateAttendanceError("Debe seleccionar una comisión");
      return;
    }

    if (attendanceItems.length === 0) {
      setCreateAttendanceError("Debe agregar al menos un alumno");
      return;
    }

    try {
      setCreatingAttendance(true);
      setCreateAttendanceError("");
      setCreateAttendanceSuccess("");

      const selectedCommission = commissions.find((c) => c.commissionId === attendanceCommissionId);
      if (!selectedCommission) {
        setCreateAttendanceError("Comisión no encontrada");
        return;
      }

      await createAttendance(idToken, {
        subjectId: selectedCommission.subjectId,
        commissionId: attendanceCommissionId,
        classDate: attendanceDate,
        items: attendanceItems
      });

      setCreateAttendanceSuccess("Asistencia registrada correctamente");
      setAttendanceItems([]);
      await loadAttendances();
    } catch (err) {
      setCreateAttendanceError(err instanceof Error ? err.message : "No se pudo registrar la asistencia");
    } finally {
      setCreatingAttendance(false);
    }
  }

  function handleAddAttendanceItem() {
    const newStudentId = prompt("Ingrese el ID del estudiante:");
    if (!newStudentId || newStudentId.trim() === "") return;

    const exists = attendanceItems.some((item) => item.studentId === newStudentId.trim());
    if (exists) {
      alert("El estudiante ya está en la lista");
      return;
    }

    setAttendanceItems([...attendanceItems, { studentId: newStudentId.trim(), present: true }]);
  }

  function handleToggleAttendance(studentId: string) {
    setAttendanceItems(
      attendanceItems.map((item) =>
        item.studentId === studentId ? { ...item, present: !item.present } : item
      )
    );
  }

  function handleRemoveAttendanceItem(studentId: string) {
    setAttendanceItems(attendanceItems.filter((item) => item.studentId !== studentId));
  }

  async function handleCreateExamBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!idToken) {
      setCreateExamBoardError("Sesión inválida");
      return;
    }

    try {
      setCreatingExamBoard(true);
      setCreateExamBoardError("");
      setCreateExamBoardSuccess("");

      await createExamBoard(idToken, {
        subjectId: newExamBoardSubjectId,
        examDate: newExamBoardDate,
        enrollmentOpenAt: newExamBoardEnrollmentOpen,
        enrollmentCloseAt: newExamBoardEnrollmentClose,
        teacherIds: newExamBoardTeacher.trim() ? [newExamBoardTeacher.trim()] : [],
        notes: newExamBoardNotes.trim() || undefined
      });

      setCreateExamBoardSuccess("Mesa examinadora creada correctamente");
      setNewExamBoardSubjectId("");
      setNewExamBoardDate("");
      setNewExamBoardEnrollmentOpen("");
      setNewExamBoardEnrollmentClose("");
      setNewExamBoardTeacher("");
      setNewExamBoardNotes("");
      await loadExamBoards();
    } catch (err) {
      setCreateExamBoardError(err instanceof Error ? err.message : "No se pudo crear la mesa");
    } finally {
      setCreatingExamBoard(false);
    }
  }

  function handleSelectExamBoard(board: ExamBoardItem) {
    setSelectedExamBoard(board);
    loadExamBoardDetails(board.examBoardId);
  }

  async function loadExamBoardDetails(examBoardId: string) {
    if (!idToken) return;

    try {
      const [enrollments, grades] = await Promise.all([
        fetchExamEnrollments(idToken, examBoardId),
        fetchExamGrades(idToken, examBoardId)
      ]);

      setExamEnrollments(enrollments.items);
      setExamGrades(grades.items);

      // Initialize grade inputs from existing grades
      setGradeInputs(
        grades.items.map((g) => ({
          studentId: g.studentId,
          grade: g.grade ?? undefined,
          absent: g.absent,
          observation: g.observation ?? undefined
        }))
      );
    } catch {
      // Silently fail
    }
  }

  async function handleEnrollStudent() {
    if (!selectedExamBoard || !idToken) return;

    const studentId = prompt("Ingrese el ID del estudiante:");
    if (!studentId || studentId.trim() === "") return;

    try {
      setEnrollingStudent(true);
      setEnrollStudentError("");
      setEnrollStudentSuccess("");

      await enrollStudentToExamBoard(idToken, selectedExamBoard.examBoardId, studentId.trim());

      setEnrollStudentSuccess(`Estudiante ${studentId} inscripto correctamente`);
      await loadExamBoardDetails(selectedExamBoard.examBoardId);
    } catch (err) {
      setEnrollStudentError(err instanceof Error ? err.message : "No se pudo inscribir al estudiante");
    } finally {
      setEnrollingStudent(false);
    }
  }

  async function handleApproveBoard(board: ExamBoardItem) {
    if (!idToken) return;

    try {
      await approveExamBoard(idToken, board.examBoardId);
      await loadExamBoards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo aprobar la mesa");
    }
  }

  async function handleOpenBoard(board: ExamBoardItem) {
    if (!idToken) return;

    try {
      await openExamBoard(idToken, board.examBoardId);
      await loadExamBoards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo abrir la mesa");
    }
  }

  async function handleSubmitBoard(board: ExamBoardItem) {
    if (!idToken) return;

    try {
      await submitExamBoard(idToken, board.examBoardId);
      await loadExamBoards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo enviar a control");
    }
  }

  async function handleValidateBoard(board: ExamBoardItem) {
    if (!idToken) return;

    try {
      await validateExamBoard(idToken, board.examBoardId);
      await loadExamBoards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo validar la mesa");
    }
  }

  async function handleCloseBoard(board: ExamBoardItem) {
    if (!idToken) return;

    try {
      await closeExamBoard(idToken, board.examBoardId);
      await loadExamBoards();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo cerrar la mesa");
    }
  }

  async function handleLoadGrades(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExamBoard || !idToken) return;

    try {
      setLoadingGrades(true);
      setLoadGradesError("");
      setLoadGradesSuccess("");

      await loadExamGrades(idToken, selectedExamBoard.examBoardId, gradeInputs);

      setLoadGradesSuccess("Notas cargadas correctamente");
      await loadExamBoardDetails(selectedExamBoard.examBoardId);
    } catch (err) {
      setLoadGradesError(err instanceof Error ? err.message : "No se pudieron cargar las notas");
    } finally {
      setLoadingGrades(false);
    }
  }

  function handleAddGradeInput() {
    const studentId = prompt("Ingrese el ID del estudiante:");
    if (!studentId || studentId.trim() === "") return;

    const exists = gradeInputs.some((g) => g.studentId === studentId.trim());
    if (exists) {
      alert("El estudiante ya está en la lista");
      return;
    }

    setGradeInputs([...gradeInputs, { studentId: studentId.trim(), grade: undefined, absent: false }]);
  }

  function handleUpdateGradeInput(studentId: string, field: keyof GradeInput, value: any) {
    setGradeInputs(
      gradeInputs.map((g) => (g.studentId === studentId ? { ...g, [field]: value } : g))
    );
  }

  function handleRemoveGradeInput(studentId: string) {
    setGradeInputs(gradeInputs.filter((g) => g.studentId !== studentId));
  }

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idToken) return;

    try {
      setCreatingTemplate(true);
      setCreateTemplateError("");
      await createCertificateTemplate(idToken, newTemplateName, newTemplateFields, [], "GENERAL");
      setCreateTemplateSuccess("Plantilla creada correctamente");
      setNewTemplateName("");
      setNewTemplateFields([{ name: "", type: "text", label: "" }]);
      await loadCertificates();
    } catch (err) {
      setCreateTemplateError(err instanceof Error ? err.message : "Error creando plantilla");
    } finally {
      setCreatingTemplate(false);
    }
  }

  async function handleRequestCertificate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idToken || !requestCertificateStudent) return;

    try {
      setRequestingCertificate(true);
      const fieldValues: Record<string, string> = {};
      const template = certificateTemplates.find((t) => t.templateId === requestCertificateTemplate);
      if (template) {
        template.fields.forEach((field) => {
          fieldValues[field.name] = (document.getElementById(`field-${field.name}`) as HTMLInputElement)?.value || "";
        });
      }
      await requestCertificate(idToken, requestCertificateTemplate, requestCertificateStudent, fieldValues);
      alert("Solicitud de certificado enviada");
      setRequestCertificateTemplate("");
      setRequestCertificateStudent("");
      await loadCertificates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error solicitando certificado");
    } finally {
      setRequestingCertificate(false);
    }
  }

  async function handleApproveCertificate(certificateId: string) {
    if (!idToken) return;

    try {
      await approveCertificate(idToken, certificateId);
      await loadCertificates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error aprobando certificado");
    }
  }

  async function handleRejectCertificate(certificateId: string) {
    const reason = prompt("Ingrese el motivo del rechazo:");
    if (!reason || reason.trim() === "") return;

    if (!idToken) return;

    try {
      await rejectCertificate(idToken, certificateId, reason);
      await loadCertificates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error rechazando certificado");
    }
  }

  const roleNames = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return roles.map((role) => roleLabels[role] ?? role);
  }, [apiUser]);

  const modules = useMemo(() => {
    const roles = apiUser?.roles ?? [];
    return Array.from(new Set(roles.map((role) => moduleByRole[role]).filter(Boolean)));
  }, [apiUser]);

  if (loading) {
    return <main className="container"><section className="card">Cargando...</section></main>;
  }

  if (!firebaseUser) {
    return (
      <main className="container">
        <section className="card">
          <h1>Bedelía ISEF</h1>
          <p className="subtitle">Ingreso al sistema académico</p>
          <form className="form" onSubmit={handleLogin}>
            <label>
              Usuario (email)
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button type="submit">Ingresar</button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="card">
        <div className="headerRow">
          <div>
            <h1>Panel del sistema</h1>
            <p className="subtitle">Bienvenido/a {apiUser?.username ?? firebaseUser.email}</p>
          </div>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>

        <h2>Roles</h2>
        {roleNames.length > 0 ? (
          <ul>
            {roleNames.map((roleName) => (
              <li key={roleName}>{roleName}</li>
            ))}
          </ul>
        ) : (
          <p>No hay roles asignados para este usuario.</p>
        )}

        <h2>Módulos habilitados</h2>
        {modules.length > 0 ? (
          <ul>
            {modules.map((moduleName) => (
              <li key={moduleName}>{moduleName}</li>
            ))}
          </ul>
        ) : (
          <p>No hay módulos habilitados.</p>
        )}

        {isLegajoManager ? (
          <>
            <h2>Módulo Legajos (Empleados / Jefatura)</h2>
            <form className="inlineForm" onSubmit={handleCreateLegajo}>
              <label>
                ID de alumno
                <input
                  placeholder="studentId"
                  value={newStudentId}
                  onChange={(event) => setNewStudentId(event.target.value)}
                  required
                />
              </label>
              <label>
                Estado documentación
                <select
                  value={newDocumentationStatus}
                  onChange={(event) => setNewDocumentationStatus(event.target.value as "INCOMPLETA" | "EN_REVISION" | "COMPLETA")}
                >
                  <option value="INCOMPLETA">INCOMPLETA</option>
                  <option value="EN_REVISION">EN_REVISION</option>
                  <option value="COMPLETA">COMPLETA</option>
                </select>
              </label>
              <label>
                Estado inscripción carrera
                <select
                  value={newCareerEnrollmentStatus}
                  onChange={(event) => setNewCareerEnrollmentStatus(event.target.value as "PENDIENTE" | "APROBADA" | "RECHAZADA")}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="APROBADA">APROBADA</option>
                  <option value="RECHAZADA">RECHAZADA</option>
                </select>
              </label>
              <button type="submit" disabled={creatingLegajo}>
                {creatingLegajo ? "Creando..." : "Crear legajo"}
              </button>
            </form>
            {createLegajoError ? <p className="error">{createLegajoError}</p> : null}
            {createLegajoSuccess ? <p className="success">{createLegajoSuccess}</p> : null}

            <form className="editForm" onSubmit={handleUpdateLegajo}>
              <label>
                Legajo seleccionado
                <input value={selectedLegajo?.legajoCode ?? ""} readOnly placeholder="Selecciona desde la tabla" />
              </label>
              <label>
                ID de alumno
                <input
                  value={editStudentId}
                  onChange={(event) => setEditStudentId(event.target.value)}
                  disabled={!selectedLegajo}
                  required
                />
              </label>
              <label>
                Estado documentación
                <select
                  value={editDocumentationStatus}
                  onChange={(event) => setEditDocumentationStatus(event.target.value as "INCOMPLETA" | "EN_REVISION" | "COMPLETA")}
                  disabled={!selectedLegajo}
                >
                  <option value="INCOMPLETA">INCOMPLETA</option>
                  <option value="EN_REVISION">EN_REVISION</option>
                  <option value="COMPLETA">COMPLETA</option>
                </select>
              </label>
              <label>
                Estado inscripción carrera
                <select
                  value={editCareerEnrollmentStatus}
                  onChange={(event) => setEditCareerEnrollmentStatus(event.target.value as "PENDIENTE" | "APROBADA" | "RECHAZADA")}
                  disabled={!selectedLegajo}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="APROBADA">APROBADA</option>
                  <option value="RECHAZADA">RECHAZADA</option>
                </select>
              </label>
              <label>
                Motivo auditoría
                <input
                  value={editReason}
                  onChange={(event) => setEditReason(event.target.value)}
                  disabled={!selectedLegajo}
                />
              </label>
              <button type="submit" disabled={!selectedLegajo || updatingLegajo}>
                {updatingLegajo ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
            {updateLegajoError ? <p className="error">{updateLegajoError}</p> : null}
            {updateLegajoSuccess ? <p className="success">{updateLegajoSuccess}</p> : null}

            <div className="searchRow">
              <input
                placeholder="Buscar por código interno (ej: LEG-2026-00001)"
                value={legajoCodeFilter}
                onChange={(event) => setLegajoCodeFilter(event.target.value)}
              />
            </div>

            {legajosLoading ? <p>Cargando legajos...</p> : null}
            {legajosError ? <p className="error">{legajosError}</p> : null}

            {!legajosLoading && !legajosError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Alumno</th>
                      <th>Documentación</th>
                      <th>Inscripción carrera</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legajos.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No hay legajos para mostrar.</td>
                      </tr>
                    ) : (
                      legajos.map((item) => (
                        <tr key={item.legajoId}>
                          <td>{item.legajoCode || "-"}</td>
                          <td>{item.studentId || "-"}</td>
                          <td>{item.documentationStatus}</td>
                          <td>{item.careerEnrollmentStatus}</td>
                          <td>
                            <button className="secondaryButton" type="button" onClick={() => handleSelectLegajo(item)}>
                              Editar / Ver historial
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h2>Historial de auditoría del legajo</h2>
            {auditLoading ? <p>Cargando auditoría...</p> : null}
            {auditError ? <p className="error">{auditError}</p> : null}
            {!auditLoading && !auditError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Acción</th>
                      <th>Usuario</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.length === 0 ? (
                      <tr>
                        <td colSpan={4}>Sin eventos de auditoría para mostrar.</td>
                      </tr>
                    ) : (
                      auditEvents.map((event) => (
                        <tr key={event.auditId}>
                          <td>{new Date(event.performedAt).toLocaleString()}</td>
                          <td>{event.action}</td>
                          <td>{event.performedBy}</td>
                          <td>{event.reason ?? "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h2>Inscripciones Anuales</h2>
            <form className="inlineForm" onSubmit={handleCreateEnrollment}>
              <label>
                Legajo ID
                <input
                  placeholder="ID del legajo"
                  value={enrollmentLegajoId}
                  onChange={(event) => setEnrollmentLegajoId(event.target.value)}
                  required
                />
              </label>
              <label>
                Año lectivo
                <input
                  type="number"
                  value={enrollmentYear}
                  onChange={(event) => setEnrollmentYear(Number(event.target.value))}
                  min={2000}
                  max={2100}
                  required
                />
              </label>
              <button type="submit" disabled={creatingEnrollment}>
                {creatingEnrollment ? "Creando..." : "Crear inscripción"}
              </button>
            </form>
            {createEnrollmentError ? <p className="error">{createEnrollmentError}</p> : null}
            {createEnrollmentSuccess ? <p className="success">{createEnrollmentSuccess}</p> : null}

            {enrollmentsLoading ? <p>Cargando inscripciones...</p> : null}
            {enrollmentsError ? <p className="error">{enrollmentsError}</p> : null}

            {!enrollmentsLoading && !enrollmentsError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Legajo ID</th>
                      <th>Alumno ID</th>
                      <th>Año</th>
                      <th>Estado</th>
                      <th>Validación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No hay inscripciones para mostrar.</td>
                      </tr>
                    ) : (
                      enrollments.map((enrollment) => (
                        <tr key={enrollment.enrollmentId}>
                          <td>{enrollment.legajoId}</td>
                          <td>{enrollment.studentId}</td>
                          <td>{enrollment.year}</td>
                          <td>{enrollment.status}</td>
                          <td>{enrollment.validationSummary}</td>
                          <td>
                            {enrollment.status === "PENDIENTE" && (apiUser?.roles.includes("JEFE_BEDELIA") || apiUser?.roles.includes("SUBJEFE_BEDELIA")) ? (
                              <>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleApproveEnrollment(enrollment.enrollmentId)}
                                  style={{ marginRight: "6px" }}
                                >
                                  Aprobar
                                </button>
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleRejectEnrollment(enrollment.enrollmentId)}
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h2>Materias y Comisiones</h2>
            <form className="inlineForm" onSubmit={handleCreateSubject}>
              <label>
                Carrera
                <input
                  placeholder="ID de carrera"
                  value={newSubjectCareer}
                  onChange={(event) => setNewSubjectCareer(event.target.value)}
                  required
                />
              </label>
              <label>
                Nombre materia
                <input
                  placeholder="Nombre de la materia"
                  value={newSubjectName}
                  onChange={(event) => setNewSubjectName(event.target.value)}
                  required
                />
              </label>
              <label>
                Año
                <input
                  type="number"
                  value={newSubjectYear}
                  onChange={(event) => setNewSubjectYear(Number(event.target.value))}
                  min={1}
                  max={5}
                  required
                />
              </label>
              <button type="submit" disabled={creatingSubject}>
                {creatingSubject ? "Creando..." : "Crear materia"}
              </button>
            </form>
            {createSubjectError ? <p className="error">{createSubjectError}</p> : null}
            {createSubjectSuccess ? <p className="success">{createSubjectSuccess}</p> : null}

            {subjectsLoading ? <p>Cargando materias...</p> : null}
            {subjectsError ? <p className="error">{subjectsError}</p> : null}

            {!subjectsLoading && !subjectsError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Año</th>
                      <th>Carrera</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No hay materias para mostrar.</td>
                      </tr>
                    ) : (
                      subjects.map((subject) => (
                        <tr key={subject.subjectId}>
                          <td>{subject.name}</td>
                          <td>{subject.year}</td>
                          <td>{subject.careerId}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h3>Comisiones</h3>
            <form className="inlineForm" onSubmit={handleCreateCommission}>
              <label>
                Materia
                <select
                  value={newCommissionSubjectId}
                  onChange={(event) => setNewCommissionSubjectId(event.target.value)}
                  required
                >
                  <option value="">Seleccionar materia</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name} (Año {subject.year})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nombre comisión
                <input
                  placeholder="Ej: Comisión A"
                  value={newCommissionName}
                  onChange={(event) => setNewCommissionName(event.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={creatingCommission}>
                {creatingCommission ? "Creando..." : "Crear comisión"}
              </button>
            </form>
            {createCommissionError ? <p className="error">{createCommissionError}</p> : null}
            {createCommissionSuccess ? <p className="success">{createCommissionSuccess}</p> : null}

            {commissionsLoading ? <p>Cargando comisiones...</p> : null}
            {commissionsError ? <p className="error">{commissionsError}</p> : null}

            {!commissionsLoading && !commissionsError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th>Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.length === 0 ? (
                      <tr>
                        <td colSpan={2}>No hay comisiones para mostrar.</td>
                      </tr>
                    ) : (
                      commissions.map((commission) => {
                        const subject = subjects.find((s) => s.subjectId === commission.subjectId);
                        return (
                          <tr key={commission.commissionId}>
                            <td>{subject?.name ?? commission.subjectId}</td>
                            <td>{commission.name}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h3>Inscripción a Materias</h3>
            <form className="inlineForm" onSubmit={handleCreateSubjectEnrollment}>
              <label>
                Alumno ID
                <input
                  placeholder="ID del alumno"
                  value={enrollSubjectStudentId}
                  onChange={(event) => setEnrollSubjectStudentId(event.target.value)}
                  required
                />
              </label>
              <label>
                Materia
                <select
                  value={enrollSubjectId}
                  onChange={(event) => setEnrollSubjectId(event.target.value)}
                  required
                >
                  <option value="">Seleccionar materia</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name} (Año {subject.year})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Año lectivo
                <input
                  type="number"
                  value={enrollSubjectYear}
                  onChange={(event) => setEnrollSubjectYear(Number(event.target.value))}
                  min={2000}
                  max={2100}
                  required
                />
              </label>
              <button type="submit" disabled={creatingSubjectEnrollment}>
                {creatingSubjectEnrollment ? "Inscribiendo..." : "Inscribir a materia"}
              </button>
            </form>
            {createSubjectEnrollmentError ? <p className="error">{createSubjectEnrollmentError}</p> : null}
            {createSubjectEnrollmentSuccess ? <p className="success">{createSubjectEnrollmentSuccess}</p> : null}

            {subjectEnrollmentsLoading ? <p>Cargando inscripciones a materias...</p> : null}
            {subjectEnrollmentsError ? <p className="error">{subjectEnrollmentsError}</p> : null}

            {!subjectEnrollmentsLoading && !subjectEnrollmentsError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Materia</th>
                      <th>Año</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectEnrollments.length === 0 ? (
                      <tr>
                        <td colSpan={4}>No hay inscripciones a materias para mostrar.</td>
                      </tr>
                    ) : (
                      subjectEnrollments.map((enrollment) => {
                        const subject = subjects.find((s) => s.subjectId === enrollment.subjectId);
                        return (
                          <tr key={enrollment.enrollmentId}>
                            <td>{enrollment.studentId}</td>
                            <td>{subject?.name ?? enrollment.subjectId}</td>
                            <td>{enrollment.year}</td>
                            <td>{enrollment.status}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}

        {isProfesor ? (
          <>
            <h2>Módulo Profesores - Asistencias</h2>
            <form className="inlineForm" onSubmit={handleCreateAttendance}>
              <label>
                Comisión
                <select
                  value={attendanceCommissionId}
                  onChange={(event) => setAttendanceCommissionId(event.target.value)}
                  required
                >
                  <option value="">Seleccionar comisión</option>
                  {commissions.map((commission) => {
                    const subject = subjects.find((s) => s.subjectId === commission.subjectId);
                    return (
                      <option key={commission.commissionId} value={commission.commissionId}>
                        {subject?.name ?? commission.subjectId} - {commission.name}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                Fecha
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(event) => setAttendanceDate(event.target.value)}
                  required
                />
              </label>
              <button type="button" onClick={handleAddAttendanceItem}>
                + Agregar alumno
              </button>
              <button type="submit" disabled={creatingAttendance || attendanceItems.length === 0}>
                {creatingAttendance ? "Guardando..." : "Guardar asistencia"}
              </button>
            </form>
            {createAttendanceError ? <p className="error">{createAttendanceError}</p> : null}
            {createAttendanceSuccess ? <p className="success">{createAttendanceSuccess}</p> : null}

            {attendanceItems.length > 0 ? (
              <div className="tableWrap">
                <h3>Lista de asistencia (provisoria)</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Estudiante ID</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceItems.map((item) => (
                      <tr key={item.studentId}>
                        <td>{item.studentId}</td>
                        <td>
                          <button
                            type="button"
                            className="secondaryButton"
                            onClick={() => handleToggleAttendance(item.studentId)}
                          >
                            {item.present ? "✓ Presente" : "✗ Ausente"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="secondaryButton"
                            onClick={() => handleRemoveAttendanceItem(item.studentId)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h3>Registros de asistencia</h3>
            {attendancesLoading ? <p>Cargando asistencias...</p> : null}
            {attendancesError ? <p className="error">{attendancesError}</p> : null}

            {!attendancesLoading && !attendancesError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Comisión</th>
                      <th>Alumnos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendances.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No hay registros de asistencia para mostrar.</td>
                      </tr>
                    ) : (
                      attendances.map((attendance) => {
                        const commission = commissions.find((c) => c.commissionId === attendance.commissionId);
                        const subject = commission ? subjects.find((s) => s.subjectId === commission.subjectId) : undefined;
                        const presentCount = attendance.items.filter((item: any) => item.present).length;
                        const totalCount = attendance.items.length;

                        return (
                          <tr key={attendance.attendanceId}>
                            <td>{attendance.classDate}</td>
                            <td>
                              {subject?.name ?? attendance.subjectId} - {commission?.name ?? attendance.commissionId}
                            </td>
                            <td>
                              {presentCount}/{totalCount} presentes
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            <h2>Mesas Examinadoras</h2>
            <form className="inlineForm" onSubmit={handleCreateExamBoard}>
              <label>
                Materia
                <select
                  value={newExamBoardSubjectId}
                  onChange={(event) => setNewExamBoardSubjectId(event.target.value)}
                  required
                >
                  <option value="">Seleccionar materia</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.name} (Año {subject.year})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fecha examen
                <input
                  type="date"
                  value={newExamBoardDate}
                  onChange={(event) => setNewExamBoardDate(event.target.value)}
                  required
                />
              </label>
              <label>
                Inscripción abre
                <input
                  type="datetime-local"
                  value={newExamBoardEnrollmentOpen}
                  onChange={(event) => setNewExamBoardEnrollmentOpen(event.target.value)}
                  required
                />
              </label>
              <label>
                Inscripción cierra
                <input
                  type="datetime-local"
                  value={newExamBoardEnrollmentClose}
                  onChange={(event) => setNewExamBoardEnrollmentClose(event.target.value)}
                  required
                />
              </label>
              <label>
                Profesor (ID)
                <input
                  value={newExamBoardTeacher}
                  onChange={(event) => setNewExamBoardTeacher(event.target.value)}
                  placeholder="UID del profesor"
                  required
                />
              </label>
              <label>
                Notas
                <input
                  value={newExamBoardNotes}
                  onChange={(event) => setNewExamBoardNotes(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <button type="submit" disabled={creatingExamBoard}>
                {creatingExamBoard ? "Creando..." : "Crear mesa"}
              </button>
            </form>
            {createExamBoardError ? <p className="error">{createExamBoardError}</p> : null}
            {createExamBoardSuccess ? <p className="success">{createExamBoardSuccess}</p> : null}

            {examBoardsLoading ? <p>Cargando mesas...</p> : null}
            {examBoardsError ? <p className="error">{examBoardsError}</p> : null}

            {!examBoardsLoading && !examBoardsError ? (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Materia</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examBoards.length === 0 ? (
                      <tr>
                        <td colSpan={5}>No hay mesas para mostrar.</td>
                      </tr>
                    ) : (
                      examBoards.map((board) => {
                        const subject = subjects.find((s) => s.subjectId === board.subjectId);
                        return (
                          <tr key={board.examBoardId}>
                            <td>{board.examBoardCode}</td>
                            <td>{subject?.name ?? board.subjectId}</td>
                            <td>{board.examDate}</td>
                            <td>{board.status}</td>
                            <td>
                              <button
                                className="secondaryButton"
                                type="button"
                                onClick={() => handleSelectExamBoard(board)}
                                style={{ marginRight: "6px" }}
                              >
                                Ver detalle
                              </button>
                              {board.status === "SOLICITADA" && (apiUser?.roles.includes("JEFE_BEDELIA") || apiUser?.roles.includes("SUBJEFE_BEDELIA")) ? (
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleApproveBoard(board)}
                                >
                                  Aprobar
                                </button>
                              ) : null}
                              {board.status === "APROBADA" && (apiUser?.roles.includes("JEFE_BEDELIA") || apiUser?.roles.includes("SUBJEFE_BEDELIA")) ? (
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleOpenBoard(board)}
                                >
                                  Abrir
                                </button>
                              ) : null}
                              {board.status === "ABIERTA" ? (
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleSubmitBoard(board)}
                                >
                                  Enviar a control
                                </button>
                              ) : null}
                              {board.status === "EN_CONTROL" && (apiUser?.roles.includes("EMPLEADO") || apiUser?.roles.includes("JEFE_BEDELIA") || apiUser?.roles.includes("SUBJEFE_BEDELIA")) ? (
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleValidateBoard(board)}
                                >
                                  Validar
                                </button>
                              ) : null}
                              {board.status === "EN_CONTROL" && (apiUser?.roles.includes("JEFE_BEDELIA") || apiUser?.roles.includes("SUBJEFE_BEDELIA")) ? (
                                <button
                                  className="secondaryButton"
                                  type="button"
                                  onClick={() => handleCloseBoard(board)}
                                >
                                  Cerrar
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}

            {selectedExamBoard ? (
              <>
                <h3>Detalle de mesa: {selectedExamBoard.examBoardCode}</h3>
                <p>
                  <strong>Estado:</strong> {selectedExamBoard.status} |{" "}
                  <strong>Fecha examen:</strong> {selectedExamBoard.examDate}
                </p>
                <button
                  className="secondaryButton"
                  type="button"
                  onClick={() => {
                    if (!idToken || !selectedExamBoard) return;
                    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
                    window.open(
                      `${apiUrl}/api/modulos/profesores/exam-boards/${selectedExamBoard.examBoardId}/pdf`,
                      "_blank"
                    );
                  }}
                  style={{ marginBottom: "20px" }}
                >
                  📄 Descargar PDF de inscriptos
                </button>

                <h4>Inscriptos ({examEnrollments.length})</h4>
                <button className="secondaryButton" type="button" onClick={handleEnrollStudent} disabled={enrollingStudent}>
                  + Inscribir alumno
                </button>
                {enrollStudentError ? <p className="error">{enrollStudentError}</p> : null}
                {enrollStudentSuccess ? <p className="success">{enrollStudentSuccess}</p> : null}

                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Estudiante ID</th>
                        <th>Elegible</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examEnrollments.length === 0 ? (
                        <tr>
                          <td colSpan={3}>No hay inscriptos.</td>
                        </tr>
                      ) : (
                        examEnrollments.map((enroll) => (
                          <tr key={enroll.enrollmentId}>
                            <td>{enroll.studentId}</td>
                            <td>{enroll.eligible ? "Sí" : "No"}</td>
                            <td>{enroll.status}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <h4>Notas</h4>
                <form onSubmit={handleLoadGrades}>
                  <button className="secondaryButton" type="button" onClick={handleAddGradeInput}>
                    + Agregar estudiante
                  </button>
                  <button type="submit" disabled={loadingGrades || gradeInputs.length === 0}>
                    {loadingGrades ? "Guardando..." : "Guardar notas"}
                  </button>
                </form>
                {loadGradesError ? <p className="error">{loadGradesError}</p> : null}
                {loadGradesSuccess ? <p className="success">{loadGradesSuccess}</p> : null}

                {gradeInputs.length > 0 ? (
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Estudiante ID</th>
                          <th>Nota (1-10)</th>
                          <th>Ausente</th>
                          <th>Observación</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradeInputs.map((gradeInput) => (
                          <tr key={gradeInput.studentId}>
                            <td>{gradeInput.studentId}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={gradeInput.grade ?? ""}
                                onChange={(e) =>
                                  handleUpdateGradeInput(
                                    gradeInput.studentId,
                                    "grade",
                                    e.target.value ? Number(e.target.value) : undefined
                                  )
                                }
                                disabled={gradeInput.absent}
                                style={{ width: "60px" }}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={gradeInput.absent ?? false}
                                onChange={(e) =>
                                  handleUpdateGradeInput(gradeInput.studentId, "absent", e.target.checked)
                                }
                              />
                            </td>
                            <td>
                              <input
                                value={gradeInput.observation ?? ""}
                                onChange={(e) =>
                                  handleUpdateGradeInput(gradeInput.studentId, "observation", e.target.value)
                                }
                                placeholder="Opcional"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                className="secondaryButton"
                                onClick={() => handleRemoveGradeInput(gradeInput.studentId)}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {examGrades.length > 0 ? (
                  <>
                    <h4>Notas guardadas</h4>
                    <div className="tableWrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Estudiante ID</th>
                            <th>Nota</th>
                            <th>Ausente</th>
                            <th>Observación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examGrades.map((record) => (
                            <tr key={record.recordId}>
                              <td>{record.studentId}</td>
                              <td>{record.grade ?? "-"}</td>
                              <td>{record.absent ? "Sí" : "No"}</td>
                              <td>{record.observation ?? "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}



        {isCertificateManager || isStudent ? (
          <>
            <h2>Certificados</h2>

            {isCertificateManager ? (
              <>
                <h3>Crear Plantilla de Certificado</h3>
                <form onSubmit={handleCreateTemplate} className="form">
                  <div className="formGroup">
                    <label>Nombre de la plantilla:</label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      required
                      placeholder="Ej: Certificado de Aprobación"
                    />
                  </div>

                  <div className="formGroup">
                    <label>Campos de la plantilla:</label>
                    {newTemplateFields.map((field, idx) => (
                      <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                        <input
                          type="text"
                          placeholder="Nombre del campo"
                          value={field.name}
                          onChange={(e) => {
                            const updated = [...newTemplateFields];
                            updated[idx].name = e.target.value;
                            setNewTemplateFields(updated);
                          }}
                        />
                        <select
                          value={field.type}
                          onChange={(e) => {
                            const updated = [...newTemplateFields];
                            updated[idx].type = e.target.value as "text" | "date" | "number";
                            setNewTemplateFields(updated);
                          }}
                        >
                          <option value="text">Texto</option>
                          <option value="date">Fecha</option>
                          <option value="number">Número</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Etiqueta"
                          value={field.label}
                          onChange={(e) => {
                            const updated = [...newTemplateFields];
                            updated[idx].label = e.target.value;
                            setNewTemplateFields(updated);
                          }}
                        />
                        <button
                          type="button"
                          className="secondaryButton"
                          onClick={() => setNewTemplateFields(newTemplateFields.filter((_, i) => i !== idx))}
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="secondaryButton"
                      onClick={() => setNewTemplateFields([...newTemplateFields, { name: "", type: "text", label: "" }])}
                    >
                      + Agregar campo
                    </button>
                  </div>

                  <button type="submit" disabled={creatingTemplate || !newTemplateName.trim()}>
                    {creatingTemplate ? "Creando..." : "Crear Plantilla"}
                  </button>
                </form>
                {createTemplateError ? <p className="error">{createTemplateError}</p> : null}
                {createTemplateSuccess ? <p className="success">{createTemplateSuccess}</p> : null}

                <h3>Solicitudes de Certificados</h3>
                {certificatesLoading ? (
                  <p>Cargando certificados...</p>
                ) : certificatesError ? (
                  <p className="error">{certificatesError}</p>
                ) : certificateRequests.length > 0 ? (
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Estudiante</th>
                          <th>Plantilla</th>
                          <th>Estado</th>
                          <th>Solicitado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certificateRequests.map((cert) => (
                          <tr key={cert.certificateId}>
                            <td>{cert.certificateCode}</td>
                            <td>{cert.studentId}</td>
                            <td>{cert.templateId}</td>
                            <td>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    cert.status === "APROBADO"
                                      ? "#d4edda"
                                      : cert.status === "RECHAZADO"
                                        ? "#f8d7da"
                                        : "#fff3cd",
                                  color:
                                    cert.status === "APROBADO"
                                      ? "#155724"
                                      : cert.status === "RECHAZADO"
                                        ? "#721c24"
                                        : "#856404"
                                }}
                              >
                                {cert.status}
                              </span>
                            </td>
                            <td>{new Date(cert.requestedAt).toLocaleDateString()}</td>
                            <td>
                              {cert.status === "SOLICITADO" ? (
                                <>
                                  <button
                                    className="secondaryButton"
                                    onClick={() => handleApproveCertificate(cert.certificateId)}
                                    style={{ marginRight: "5px" }}
                                  >
                                    Aprobar
                                  </button>
                                  <button
                                    className="secondaryButton"
                                    onClick={() => handleRejectCertificate(cert.certificateId)}
                                  >
                                    Rechazar
                                  </button>
                                </>
                              ) : cert.status === "APROBADO" ? (
                                <button
                                  className="secondaryButton"
                                  onClick={() => downloadCertificatePDF(idToken, cert.certificateId)}
                                >
                                  Descargar PDF
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No hay solicitudes de certificados</p>
                )}
              </>
            ) : null}

            {isStudent ? (
              <>
                <h3>Solicitar Certificado</h3>
                <form onSubmit={handleRequestCertificate} className="form">
                  <div className="formGroup">
                    <label>Plantilla de certificado:</label>
                    <select
                      value={requestCertificateTemplate}
                      onChange={(e) => setRequestCertificateTemplate(e.target.value)}
                      required
                    >
                      <option value="">-- Seleccionar plantilla --</option>
                      {certificateTemplates.map((template) => (
                        <option key={template.templateId} value={template.templateId}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {requestCertificateTemplate &&
                    certificateTemplates.find((t) => t.templateId === requestCertificateTemplate)?.fields.map((field) => (
                      <div key={field.name} className="formGroup">
                        <label>{field.label || field.name}:</label>
                        <input
                          id={`field-${field.name}`}
                          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
                          placeholder={field.label || field.name}
                        />
                      </div>
                    ))}

                  <button type="submit" disabled={requestingCertificate || !requestCertificateTemplate}>
                    {requestingCertificate ? "Solicitando..." : "Solicitar Certificado"}
                  </button>
                </form>

                <h3>Mis Certificados</h3>
                {certificatesLoading ? (
                  <p>Cargando certificados...</p>
                ) : certificatesError ? (
                  <p className="error">{certificatesError}</p>
                ) : certificateRequests.length > 0 ? (
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Plantilla</th>
                          <th>Estado</th>
                          <th>Solicitado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {certificateRequests.map((cert) => (
                          <tr key={cert.certificateId}>
                            <td>{cert.certificateCode}</td>
                            <td>{cert.templateId}</td>
                            <td>
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    cert.status === "APROBADO"
                                      ? "#d4edda"
                                      : cert.status === "RECHAZADO"
                                        ? "#f8d7da"
                                        : "#fff3cd",
                                  color:
                                    cert.status === "APROBADO"
                                      ? "#155724"
                                      : cert.status === "RECHAZADO"
                                        ? "#721c24"
                                        : "#856404"
                                }}
                              >
                                {cert.status}
                              </span>
                            </td>
                            <td>{new Date(cert.requestedAt).toLocaleDateString()}</td>
                            <td>
                              {cert.status === "APROBADO" ? (
                                <button
                                  className="secondaryButton"
                                  onClick={() => downloadCertificatePDF(idToken, cert.certificateId)}
                                >
                                  Descargar PDF
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No tienes solicitudes de certificados</p>
                )}
              </>
            ) : null}
          </>
        ) : null}

        <p className="institution">I.S.E.F. Nro. 27 Prof. César S. Vásquez - Santa Fe Capital</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

export default App;



