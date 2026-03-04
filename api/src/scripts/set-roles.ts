import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "node:fs";
import path from "node:path";
import { ROLES, type Role } from "../types/roles.js";

const validRoles = new Set<string>(Object.values(ROLES));

function normalizeRoles(rawRoles: string[]): Role[] {
  const upperRoles = rawRoles.map((role) => role.trim().toUpperCase());

  const invalid = upperRoles.filter((role) => !validRoles.has(role));
  if (invalid.length > 0) {
    throw new Error(
      `Roles inválidos: ${invalid.join(", ")}. Roles permitidos: ${Object.values(ROLES).join(", ")}`
    );
  }

  return [...new Set(upperRoles)] as Role[];
}

async function main() {
  const [, , email, ...rolesArgs] = process.argv;

  if (!email || rolesArgs.length === 0) {
    console.error("Uso: npm run set-roles -- <email> <ROL1> [ROL2 ...]");
    console.error(`Roles disponibles: ${Object.values(ROLES).join(", ")}`);
    process.exit(1);
  }

  const roles = normalizeRoles(rolesArgs);

  const credentialsPath =
    process.env.FIREBASE_CREDENTIALS_PATH ??
    path.resolve(process.cwd(), "..", "bedelia-isef-firebase-adminsdk-fbsvc-29bc00fcaf.json");

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `No se encontró el archivo de credenciales en ${credentialsPath}. Definí FIREBASE_CREDENTIALS_PATH con la ruta correcta.`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, "utf-8")) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  const app = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    })
  });

  const firebaseAuth = getAuth(app);
  const user = await firebaseAuth.getUserByEmail(email);
  await firebaseAuth.setCustomUserClaims(user.uid, { roles });

  console.log(`Roles asignados a ${email} (${user.uid}): ${roles.join(", ")}`);
  console.log("Importante: cerrá sesión y logueate de nuevo para que el token traiga los nuevos claims.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
