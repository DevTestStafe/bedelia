import { firestore } from "../config/firebase.js";

type AuditAction = "CREATE" | "UPDATE" | "APPROVE" | "REJECT" | "CLOSE" | "OPEN" | "SUBMIT" | "VALIDATE";

type AuditInput = {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  sourceModule?: string;
};

export async function writeAuditEvent(input: AuditInput) {
  await firestore.collection("audit_events").add({
    ...input,
    performedAt: new Date().toISOString()
  });
}
