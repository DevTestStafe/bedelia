# 02 - Modelo de datos (Firestore)

## 1) Convenciones
- IDs tipo ULID/UUID.
- Códigos internos legibles para usuario:
  - `LEG-YYYY-#####`
  - `TRA-YYYY-#####`
  - `MESA-YYYY-#####`
- Campos base en toda entidad:
  - `status`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `version`.

## 2) Colecciones principales

### `users`
- `uid`
- `username`
- `displayName`
- `email`
- `roles[]` (`JEFE`, `SUBJEFE`, `EMPLEADO`, `PROFESOR`, `ALUMNO`)
- `active`

### `students`
- `studentId`
- `userId`
- `legajoId`
- `dni`, `apellido`, `nombre`, `fechaNacimiento`
- `careerId`
- `currentYear` (1..4)
- `academicStatus`

### `legajos`
- `legajoId`
- `legajoCode` (único)
- `studentId`
- `careerEnrollmentStatus`
- `documentationStatus` (`INCOMPLETA`, `EN_REVISION`, `COMPLETA`)
- `cooperadoraStatus`
- `notes`

### `documents_requirements`
- `requirementId`
- `careerId`
- `name`
- `mandatory`
- `validFrom`, `validTo`

### `student_documents`
- `studentDocumentId`
- `studentId`
- `requirementId`
- `submitted`
- `validatedBy`
- `validatedAt`

### `academic_year_enrollments`
- `enrollmentId`
- `studentId`
- `year`
- `status` (`PENDIENTE`, `APROBADA`, `RECHAZADA`)
- `validationSummary`

### `subjects`
- `subjectId`
- `careerId`
- `name`
- `year`
- `commissionIds[]`
- `examRules` (asistencia mínima, correlativas, etc.)

### `subject_enrollments`
- `subjectEnrollmentId`
- `studentId`
- `subjectId`
- `commissionId`
- `status`

### `attendance_records`
- `attendanceId`
- `subjectId`
- `commissionId`
- `classDate`
- `teacherId`
- `items[]` (`studentId`, `present`, `justification`)

### `exam_terms`
- `examTermId`
- `name`
- `startDate`, `endDate`
- `enrollmentOpenAt`, `enrollmentCloseAt`
- `status`

### `exam_boards` (mesas)
- `examBoardId`
- `examBoardCode`
- `subjectId`
- `commissionId` (opcional)
- `teacherIds[]`
- `requestedBy` (profesor)
- `approvedBy` (jefe/subjefe)
- `status` (`SOLICITADA`, `APROBADA`, `ABIERTA`, `EN_CONTROL`, `CERRADA`)
- `requirementsSnapshot`

### `exam_enrollments`
- `examEnrollmentId`
- `examBoardId`
- `studentId`
- `eligible`
- `eligibilityReasons[]`
- `status`

### `exam_records`
- `examRecordId`
- `examBoardId`
- `studentId`
- `grade`
- `absent`
- `observation`
- `loadedBy`
- `validatedBy`
- `status` (`BORRADOR`, `PRESENTADA`, `VALIDADA`)

### `procedures` (trámites)
- `procedureId`
- `procedureCode`
- `legajoId`
- `type`
- `requestedBy`
- `status` (`ABIERTO`, `EN_GESTION`, `RESUELTO`, `CERRADO`)
- `resolution`

### `certificates`
- `certificateId`
- `type`
- `studentId`
- `templateId`
- `status` (`SOLICITADO`, `APROBADO`, `EMITIDO`, `RECHAZADO`)
- `generatedFileUrl`

### `certificate_templates`
- `templateId`
- `name`
- `fields[]`
- `rules[]`
- `targetAudience`
- `enabled`
- `configuredBy` (jefe)

### `imports`
- `importId`
- `type` (`ALUMNOS`, `NOTAS`, etc.)
- `fileUrl`
- `summary` (ok, errores, warnings)
- `status`
- `executedBy`

### `audit_events`
Append-only de trazabilidad completa.

## 3) Relaciones críticas a respetar
1. Alumno -> Legajo -> Inscripción carrera -> Documentación completa.
2. Solo con inscripción válida puede:
   - inscribirse al año,
   - inscribirse a materias,
   - aparecer en listas de asistencia,
   - inscribirse a mesas.
3. El cierre de mesa exige consistencia entre:
   - notas en sistema,
   - acta papel (si aplica),
   - validación jefe/subjefe.

## 4) Índices sugeridos
- `students` por `dni`, `apellido`, `legajoId`.
- `exam_boards` por `status`, `examTermId`, `subjectId`.
- `exam_enrollments` por `examBoardId`, `eligible`.
- `procedures` por `legajoId`, `status`.
- `audit_events` por `entityType + entityId + performedAt desc`.
