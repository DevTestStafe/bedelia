# 04 - Roadmap y opciones de implementación

## Fase 0 (1-2 semanas) - Base técnica
- Configurar repositorio monorepo (`api`, `web`, `functions`).
- Integrar Firebase Auth + Firestore + Storage.
- Implementar gestión de usuarios y roles (solo jefe/subjefe).
- Definir esquema inicial e índices.

## Fase 1 (3-5 semanas) - Núcleo académico
- Legajos, documentación e inscripción anual.
- Inscripción a materias/comisiones.
- Asistencia de profesores por comisión.
- Carga de notas básica y consulta para alumno.

## Fase 2 (3-4 semanas) - Mesas y cierre
- Solicitud/aprobación de mesas.
- Inscripción a exámenes por periodo.
- Padrón elegible y PDF institucional.
- Flujo de cierre con doble control (digital/papel).

## Fase 3 (2-3 semanas) - Certificados y trámites
- Solicitudes de certificados y emisión PDF.
- Editor de plantillas de certificados (jefe).
- Trámites vinculados al legajo con códigos propios.

## Fase 4 (2-3 semanas) - Importación y calidad
- Importador Excel con prevalidación por fila.
- Tablero de inconsistencias y auditoría.
- Hardening de seguridad y backup/recovery.

## Opciones de stack (sugeridas)

### Opción A (rápida y mantenible)
- API: NestJS
- Web: Next.js
- Auth/DB/Storage: Firebase
- PDF: `pdf-lib` o `puppeteer`
- Excel: `exceljs`

### Opción B (muy simple para MVP)
- Frontend + backend ligero con Next.js fullstack
- Firebase Admin SDK en server actions
- Cloud Functions solo para jobs críticos

## KPIs sugeridos
- Tiempo promedio de carga de notas por mesa
- % de inscripciones rechazadas por documentación
- Tiempo de cierre de mesa
- Cantidad de rectificaciones por errores de carga
- Tiempo de emisión de certificados

## Riesgos y mitigación
- **Reglas cambiantes**: motor de reglas parametrizable.
- **Errores de carga masiva**: prevalidación + rollback lógico por lote.
- **Ambigüedad de permisos**: matriz RBAC formal aprobada por dirección.
- **Dependencia de papel**: flujo híbrido con evidencia digital adjunta.
