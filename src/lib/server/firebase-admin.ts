import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function initAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountJson) as Record<string, string>),
      projectId,
      storageBucket: resolveStorageBucket(projectId),
    });
  }

  // App Hosting / Cloud Run — Application Default Credentials
  return initializeApp({
    projectId,
    storageBucket: resolveStorageBucket(projectId),
  });
}

function resolveStorageBucket(projectId?: string): string | undefined {
  const configured = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  if (configured) {
    return configured.replace(/^gs:\/\//, "");
  }
  if (projectId) {
    return `${projectId}.firebasestorage.app`;
  }
  return undefined;
}

export function getFirebaseAdminApp(): App {
  return initAdminApp();
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getFirebaseAdminBucket() {
  return getStorage(getFirebaseAdminApp()).bucket();
}
