import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";

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
  latitude: number;
  longitude: number;
  accuracy: number | null;
  status: "pending" | "acknowledged" | "resolved" | "cancelled";
  createdAt: Timestamp | null;
  acknowledgedAt?: Timestamp | null;
  resolvedAt?: Timestamp | null;
  responderNote?: string;
  contactsNotified: string[];
};

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
    // This requires a composite index: userId + createdAt desc
    // If index doesn't exist yet, falls back to unordered query
    const q = query(
      collection(db, "emergencyAlerts"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
  } catch (error: any) {
    // Fallback: query without orderBy if composite index is missing
    console.warn("Composite index missing, fetching without order:", error.message);
    const q = query(
      collection(db, "emergencyAlerts"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const alerts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as EmergencyAlert));
    // Sort client-side
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

export async function acknowledgeAlert(alertId: string, note?: string) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "acknowledged",
    acknowledgedAt: serverTimestamp(),
    responderNote: note || "Help is on the way",
  });
}

export async function resolveAlert(alertId: string, note?: string) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "resolved",
    resolvedAt: serverTimestamp(),
    responderNote: note || "Emergency resolved",
  });
}

export async function cancelAlert(alertId: string) {
  return updateDoc(doc(db, "emergencyAlerts", alertId), {
    status: "cancelled",
  });
}
