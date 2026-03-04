function padNumber(value: number, length: number) {
  return String(value).padStart(length, "0");
}

export function generateInternalCode(prefix: "LEG" | "TRA" | "MESA" | "CERT", sequence: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${padNumber(sequence, 5)}`;
}
