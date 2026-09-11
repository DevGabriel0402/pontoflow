import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { ApiError } from "./http.js";

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new ApiError(500, "firebase-config-invalid", "FIREBASE_SERVICE_ACCOUNT_JSON possui JSON invalido.");
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new ApiError(
      500,
      "firebase-config-missing",
      "Credenciais administrativas do Firebase nao foram configuradas na Vercel."
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function getAdminApp() {
  if (getApps().length) return getApps()[0];
  return initializeApp({ credential: cert(readServiceAccount()) });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export { FieldValue, Timestamp };
