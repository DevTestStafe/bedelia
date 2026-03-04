# 01 - Arquitectura propuesta (Node.js + Firebase)

## 1) Vista general
Arquitectura orientada a módulos académicos con backend centralizado.

- **Frontend web**: portal único con login.
- **Backend API (Node.js)**: aplica reglas de negocio y autorización.
- **Firebase Auth**: autenticación por usuario/contraseña.
- **Firestore**: datos transaccionales y relacionales por IDs.
- **Storage**: PDFs, planillas, documentos anexos.
- **Cloud Functions**: procesos críticos (cierres, generación de códigos, validaciones programadas, notificaciones).

## 2) Módulos funcionales
- **Empleados**: inscripciones, carga administrativa, organización de aulas y apoyo en mesas.
- **Jefe/Subjefe**: aprobación, control, cierre de mesas y certificaciones.
- **Profesores**: asistencias, notas, observaciones, solicitud de mesa.
- **Alumnos**: consulta de estado, inscripciones, solicitudes y seguimiento.

## 3) Arquitectura lógica por capas
1. **API Layer**
   - Endpoints REST (o GraphQL) por dominio.
2. **Application Layer**
   - Casos de uso: `inscribirAlumno`, `cerrarMesa`, `emitirCertificado`.
3. **Domain Layer**
   - Entidades y reglas de negocio.
4. **Infrastructure Layer**
   - Firestore repositories, Storage adapters, PDF/Excel services.

## 4) Seguridad y control
- Autenticación con Firebase.
- Roles y claims en token.
- Autorización por backend + Firestore Rules.
- Campos de auditoría obligatorios en cada operación:
  - `createdBy`, `updatedBy`, `approvedBy`, `timestamp`, `sourceModule`, `changeReason`.

## 5) Eventos y trazabilidad
Se recomienda una colección `audit_events` append-only:
- `eventId`
- `entityType`
- `entityId`
- `action` (CREATE, UPDATE, APPROVE, REJECT, CLOSE)
- `before` / `after`
- `performedBy`
- `performedAt`
- `ip` / `userAgent` (opcional)

## 6) Documentos institucionales
Todo documento exportado (PDF/Excel) debe incluir:
- Logo institucional
- Texto fijo: **"I.S.E.F. Nro. 27 Prof. César S. Vásquez - Santa Fe Capital"**

## 7) Escalabilidad y operación
- Índices compuestos en Firestore para búsquedas frecuentes.
- Backups diarios.
- Feature flags para habilitar módulos por etapa.
- Observabilidad: logs centralizados y alertas por fallos de cierre/aprobación.
