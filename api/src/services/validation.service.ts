import { firestore } from "../config/firebase.js";

export async function canEnrollInYear(legajoId: string): Promise<{ valid: boolean; reason?: string }> {
  const legajoRef = firestore.collection("legajos").doc(legajoId);
  const snapshot = await legajoRef.get();

  if (!snapshot.exists) {
    return { valid: false, reason: "El legajo no existe" };
  }

  const data = snapshot.data();
  const documentationStatus = data?.documentationStatus;
  const careerEnrollmentStatus = data?.careerEnrollmentStatus;

  if (documentationStatus !== "COMPLETA") {
    return {
      valid: false,
      reason: `Documentación ${documentationStatus ?? "sin definir"}. Debe estar COMPLETA para inscribirse.`
    };
  }

  if (careerEnrollmentStatus !== "APROBADA") {
    return {
      valid: false,
      reason: `Inscripción a carrera ${careerEnrollmentStatus ?? "sin definir"}. Debe estar APROBADA.`
    };
  }

  return { valid: true };
}
