import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserRole } from "@/context/AuthContext";

// ── Types ──────────────────────────────────────────────────────────
export type EmergencyContact = {
  id?: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
};

export type EmergencyAlert = {
  id?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  status: "pending" | "acknowledged" | "resolved" | "cancelled";
  createdAt: Timestamp | null;
  acknowledgedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;
  responderId?: string;
  responderName?: string;
  responderNote?: string;
  contactsNotified: string[];
};

// ── User Profile ───────────────────────────────────────────────────
export async function createUserProfile(
  uid: string,
  data: { email: string; displayName: string; role: UserRole }
) {
  return setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// ── Contacts CRUD ──────────────────────────────────────────────────
export async function getContacts(userId: string): Promise<EmergencyContact[]> {
  const q = query(
    collection(db, "emergencyContacts"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyContact));
}

export async function addContact(contact: Omit<EmergencyContact, "id">) {
  return addDoc(collection(db, "emergencyContacts"), contact);
}

export async function updateContact(id: string, data: Partial<EmergencyContact>) {
  return updateDoc(doc(db, "emergencyContacts", id), data);
}

export async function deleteContact(id: string) {
  return deleteDoc(doc(db, "emergencyContacts", id));
}

// ── Alerts ─────────────────────────────────────────────────────────
export async function sendEmergencyAlert(
  alert: Omit<EmergencyAlert, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, "emergencyAlerts"), {
    ...alert,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getUserAlerts(userId: string): Promise<EmergencyAlert[]> {
  try {
    const q = query(
      collection(db, "emergencyAlerts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
  } catch (error: any) {
    console.warn("Composite index missing, fetching without order:", error.message);
    const q = query(
      collection(db, "emergencyAlerts"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
    return alerts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
}

export async function getAllPendingAlerts(): Promise<EmergencyAlert[]> {
  try {
    const q = query(
      collection(db, "emergencyAlerts"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
  } catch (error: any) {
    console.warn("Composite index missing, fetching without order:", error.message);
    const q = query(
      collection(db, "emergencyAlerts"),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
    return alerts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
}

// ── Real-time listener for responders ──────────────────────────────
export function subscribeToPendingAlerts(
  callback: (alerts: EmergencyAlert[]) => void
): () => void {
  let q;
  try {
    q = query(
      collection(db, "emergencyAlerts"),
      where("status", "in", ["pending", "acknowledged"]),
      orderBy("createdAt", "desc")
    );
  } catch {
    q = query(
      collection(db, "emergencyAlerts"),
      where("status", "in", ["pending", "acknowledged"])
    );
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as EmergencyAlert)
    );
    // Sort client-side as fallback
    alerts.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
    callback(alerts);
  });

  return unsubscribe;
}

export async function acknowledgeAlert(
  alertId: string,
  responderId: string,
  responderName: string,
  note?: string
) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "acknowledged",
    acknowledgedAt: serverTimestamp(),
    responderId,
    responderName,
    responderNote: note || "Help is on the way",
  });
}

export async function resolveAlert(
  alertId: string,
  responderId: string,
  responderName: string,
  note?: string
) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
    responderId,
    responderName,
    responderNote: note || "Emergency resolved",
  });
}

export async function cancelAlert(alertId: string) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "cancelled",
  });
}
