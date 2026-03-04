# 03 - RBAC (roles/permisos) y workflows

## 1) Roles
- `JEFE_BEDELIA`
- `SUBJEFE_BEDELIA`
- `EMPLEADO`
- `PROFESOR`
- `ALUMNO`

## 2) Permisos por módulo

### Empleados
- Cargar inscripciones anuales/materias/exámenes.
- Gestionar aulas y soporte de organización.
- Cargar notas desde acta papel (si fue solicitado).
- **No pueden** cerrar mesas sin validación jefe/subjefe.

### Jefe/Subjefe
- Alta de usuarios y asignación de roles.
- Aprobar/rechazar solicitudes críticas.
- Aprobar mesas y cierre definitivo.
- Configurar plantillas de certificados.

### Profesores
- Cargar asistencia por comisión/materia.
- Cargar notas y observaciones.
- Solicitar mesa en periodos habilitados.
- Solicitar cierre de mesa (con o sin acta papel).

### Alumnos
- Consultar legajo y estado académico.
- Inscribirse a año/materias/exámenes en fechas válidas.
- Solicitar certificados/constancias.
- Consultar notas y asistencias.

## 3) Workflows críticos

### A) Inscripción de alumno (anual + materias)
1. Alumno solicita inscripción anual.
2. Sistema valida documentación y estado de legajo.
3. Empleado revisa casos observados.
4. Resultado: `APROBADA` o `RECHAZADA` con motivo.
5. Solo si anual está aprobada, habilitar inscripción a materias.

### B) Mesa examinadora
1. Profesor solicita mesa (`SOLICITADA`).
2. Jefe/subjefe aprueba (`APROBADA`).
3. Se abre inscripción en ventana temporal.
4. Al cerrar inscripción, sistema genera padrón elegible y PDF.
5. Profesor registra asistencia/notas.
6. Cierre:
   - Opción 1: notas digitales -> solicitud de aceptación.
   - Opción 2: acta papel -> empleado carga -> jefe/subjefe valida.
7. Estado final: `CERRADA`.

### C) Certificados
1. Alumno solicita certificado.
2. Motor de reglas verifica requisitos por tipo.
3. Si cumple, emite PDF institucional.
4. Si no cumple, rechazo con motivo trazable.

### D) Trámites ligados a legajo
1. Se crea trámite con código propio `TRA-`.
2. Cada acción del trámite genera evento de auditoría.
3. Cambios al legajo deben referenciar `procedureId` origen.

## 4) Reglas de negocio mínimas
- No inscripción a materia si documentación obligatoria incompleta.
- No inscripción a mesa fuera de periodo.
- No cierre de mesa sin notas completas o validación de acta.
- Certificado de alumno regular:
  - inscripción anual activa,
  - control de asistencias,
  - historial de presentaciones a examen.
- Certificado de inscripción:
  - datos personales completos,
  - documentación obligatoria presentada,
  - estado administrativo completo (incl. cooperadora si aplica).

## 5) Trazabilidad obligatoria
Cada acción crítica debe registrar:
- actor (`uid`, rol)
- timestamp
- entidad afectada
- cambio previo/posterior
- motivo/observación
- canal (`web`, `import`, `api`)
