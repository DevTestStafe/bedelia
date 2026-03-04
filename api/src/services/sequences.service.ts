import { firestore } from "../config/firebase.js";

type SequencePrefix = "LEG" | "TRA" | "MESA" | "CERT";

export async function getNextSequence(prefix: SequencePrefix) {
  const counterRef = firestore.collection("internal_code_counters").doc(prefix);

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(counterRef);

    if (!snapshot.exists) {
      transaction.set(counterRef, {
        prefix,
        value: 1,
        updatedAt: new Date().toISOString()
      });
      return 1;
    }

    const current = Number(snapshot.get("value") ?? 0);
    const next = current + 1;

    transaction.update(counterRef, {
      value: next,
      updatedAt: new Date().toISOString()
    });

    return next;
  });
}
