export const ROLES = {
  JEFE_BEDELIA: "JEFE_BEDELIA",
  SUBJEFE_BEDELIA: "SUBJEFE_BEDELIA",
  EMPLEADO: "EMPLEADO",
  PROFESOR: "PROFESOR",
  ALUMNO: "ALUMNO"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
