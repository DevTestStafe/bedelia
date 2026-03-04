# Bedelía ISEF - Sistema de Gestión Académica

Base funcional y técnica para un sistema académico de nivel superior con **Node.js + Firebase**.

## Objetivo
Centralizar y auditar la gestión de:
- Legajos de alumnos
- Inscripciones (anual, materias, exámenes)
- Asistencias y notas
- Mesas examinadoras y actas
- Certificados y constancias
- Trámites administrativos

## Documentación
- [Arquitectura](docs/01-arquitectura.md)
- [Modelo de Datos (Firestore)](docs/02-modelo-datos.md)
- [Roles, Permisos y Workflows](docs/03-rbac-workflows.md)
- [Roadmap y Plan de Implementación](docs/04-roadmap.md)
- [Configuración Firebase y Despliegue en Railway](docs/05-firebase-railway-setup.md) ← **LEER PRIMERO**

## Stack recomendado
- Backend: Node.js (NestJS recomendado)
- Base de datos: Cloud Firestore
- Autenticación: Firebase Authentication
- Archivos: Firebase Storage
- Lógica de negocio crítica: Cloud Functions
- Auditoría: colección de eventos + logs en BigQuery (opcional)

## Principios de diseño
1. Trazabilidad total por usuario
2. Flujos con estados y aprobaciones explícitas
3. Validaciones automáticas de requisitos académicos
4. Seguridad por rol y por acción (RBAC)
5. Datos exportables (PDF/Excel) con identidad institucional

## API base creada
Se creó un esqueleto ejecutable en [api/package.json](api/package.json) con:
- Express + TypeScript
- Firebase Admin SDK
- Middleware de autenticación por token Firebase
- Middleware de autorización por roles (RBAC)
- Rutas base por módulo:
  - `/api/modulos/empleados`
  - `/api/modulos/jefatura`
  - `/api/modulos/profesores`
  - `/api/modulos/alumnos`
- Endpoint de sesión: `/api/auth/me`
- Endpoint de legajos (empleados/jefatura): `/api/modulos/empleados/legajos?code=LEG-2026-00001`
- Alta de legajos (empleados/jefatura): `POST /api/modulos/empleados/legajos`
- Edición de legajos (empleados/jefatura): `PUT /api/modulos/empleados/legajos/:legajoId`
- Auditoría por legajo: `GET /api/modulos/empleados/legajos/:legajoId/auditoria`
- Inscripciones anuales (empleados/jefatura): `GET /api/modulos/empleados/inscripciones-anuales?year=2026`
- Alta de inscripción anual: `POST /api/modulos/empleados/inscripciones-anuales`
- Aprobación/rechazo de inscripción (jefe/subjefe): `PUT /api/modulos/empleados/inscripciones-anuales/:enrollmentId`
- Materias: `GET /api/modulos/materias/subjects` y `POST /api/modulos/materias/subjects`
- Comisiones: `GET /api/modulos/materias/commissions` y `POST /api/modulos/materias/commissions`
- Inscripciones a materias: `GET /api/modulos/materias/subject-enrollments` y `POST /api/modulos/materias/subject-enrollments`
- Aprobación/rechazo de inscripción a materia: `PUT /api/modulos/materias/subject-enrollments/:id/approve` y `/reject`
- Asistencias: `GET /api/modulos/profesores/attendance` y `POST /api/modulos/profesores/attendance`
- Actualización de asistencia: `PUT /api/modulos/profesores/attendance/:attendanceId`
- Resumen de asistencias por alumno: `GET /api/modulos/profesores/attendance/summary?studentId=...`
- Mesas examinadoras: `GET /api/modulos/profesores/exam-boards` y `POST /api/modulos/profesores/exam-boards`
- Workflow de mesas: `PUT /exam-boards/:id/approve`, `/open`, `/submit`, `/validate`, `/close`
- Inscripción a mesas: `GET /exam-boards/:id/enrollments` y `POST /exam-boards/:id/enrollments`
- Notas de exámenes: `GET /exam-boards/:id/grades` y `PUT /exam-boards/:id/grades`
- **Descarga PDF de inscriptos**: `GET /exam-boards/:id/pdf` - Genera planilla con lista de alumnos inscriptos
- **Gestión de certificados**:
  - Plantillas: `GET /api/modulos/jefatura/certificate-templates`, `POST` (crear)
  - Solicitudes: `GET /api/modulos/jefatura/certificates`, `POST` (solicitar)
  - Aprobación: `PUT /api/modulos/jefatura/certificates/:id/approve`
  - Rechazo: `PUT /api/modulos/jefatura/certificates/:id/reject`
  - Descarga PDF: `GET /api/modulos/jefatura/certificates/:id/pdf`
  - Código interno autogenerado: CERT-YYYY-#####
- Health check: `/api/health`

## Puesta en marcha local

**Primero**: Lee la [guía de configuración Firebase y Railway](docs/05-firebase-railway-setup.md)

1. Configurar Firebase Console y obtener credenciales
2. Copiar [api/.env.example](api/.env.example) a `api/.env` y completar credenciales backend.
3. Copiar [web/.env.example](web/.env.example) a `web/.env` y completar credenciales frontend.
4. Instalar dependencias:
	- `cd api && npm install`
	- `cd ../web && npm install`
5. Ejecutar en desarrollo:
   - Terminal 1: `cd api && npm run dev`
   - Terminal 2: `cd web && npm run dev`

## Frontend web (login + dashboard por rol)
Se creó una aplicación React en [web/package.json](web/package.json) con:
- Login con Firebase Authentication (email/contraseña)
- Consulta de sesión y roles en `/api/auth/me`
- Vista de módulos habilitados según roles
- Módulo Empleados/Jefatura con búsqueda de legajos por código interno
- Alta de legajos desde pantalla (con generación de código interno)
- Edición de legajo desde tabla y visualización de historial de auditoría
- Inscripción anual con validación automática de documentación completa
- Aprobación/rechazo de inscripciones anuales (solo jefe/subjefe)
- Gestión de materias y comisiones (crear materias, asignar comisiones)
- Inscripción de alumnos a materias con validación de inscripción anual aprobada
- Visualización de todas las inscripciones a materias por alumno y año
- Módulo Profesores con registro de asistencias por comisión y fecha
- Listado de registros de asistencia con filtros por comisión
- Marcado de presente/ausente para cada alumno en la lista
- Gestión completa de mesas examinadoras con workflow de aprobación
- Creación de mesas con período de inscripción configurable
- Inscripción de alumnos a mesas con validación de período
- Workflow de estados: SOLICITADA → APROBADA → ABIERTA → EN_CONTROL → CERRADA
- Carga de notas por profesor con validación por empleado y cierre por jefatura
- **Descarga de planillas PDF** con lista de inscriptos a cada mesa examinadora
  - PDFs con logo institucional integrado
  - Encabezado con datos de la institución
  - Tabla profesional con datos de los alumnos inscriptos
  - Secciones de firma para validación oficial
- **Gestión de certificados**:
  - Creación de plantillas de certificados (solo jefe de bedelía)
  - Configuración de campos dinámicos por plantilla
  - Solicitud de certificados por alumnos o empleados
  - Aprobación/rechazo de solicitudes (solo jefe/subjefe)
  - Generación y descarga de PDFs con branding institucional
  - Flujo de vida: SOLICITADO → APROBADO/RECHAZADO
- Código interno autogenerado formato MESA-YYYY-##### y CERT-YYYY-#####

### Configuración

**Guía completa**: [Configuración Firebase y Despliegue en Railway](docs/05-firebase-railway-setup.md)

1. Copiar [api/.env.example](api/.env.example) a `api/.env` - credenciales backend
2. Copiar [web/.env.example](web/.env.example) a `web/.env` - credenciales frontend
3. Obtener valores desde Firebase Console (ver guía completa)

### Ejecución local

**Terminal 1** (API - Puerto 4000):
```bash
cd api
npm run dev
```

**Terminal 2** (Web - Puerto 5173):
```bash
cd web
npm run dev
```

Luego accede a:
- Frontend: [http://localhost:5173](http://localhost:5173)
- API Health: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### Despliegue en Railway

Ver [guía completa de despliegue](docs/05-firebase-railway-setup.md#parte-5-desplegar-en-railway)

## Seguridad Firebase (base)
- Reglas iniciales en [firebase/firestore.rules](firebase/firestore.rules).
- Se recomienda desplegar reglas por ambiente (`dev`, `staging`, `prod`).
