import { createVerify } from "crypto";

import { getAdminUid, isAdminUid } from "@/lib/admin";
import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";

export class AdminAuthError extends Error {
  readonly status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AdminAuthError";
    this.status = status;
  }
}

function getFirebaseProjectId(): string {
  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    throw new AdminAuthError(
      "Server misconfigured: missing Firebase project id.",
      500,
    );
  }
  return projectId;
}

interface FirebaseJwtHeader {
  kid?: string;
  alg?: string;
}

interface FirebaseJwtPayload {
  sub: string;
  aud: string;
  iss: string;
  exp: number;
}

function decodeJwtPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
}

let cachedCerts: { at: number; keys: Record<string, string> } | null = null;

async function getFirebasePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now - cachedCerts.at < 3_600_000) {
    return cachedCerts.keys;
  }

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  if (!response.ok) {
    throw new AdminAuthError("Could not verify sign-in token.");
  }

  const keys = (await response.json()) as Record<string, string>;
  cachedCerts = { at: now, keys };
  return keys;
}

/** Verify Firebase ID token via Google public certs (no Admin SDK credentials needed). */
async function verifyFirebaseIdToken(token: string): Promise<string> {
  const projectId = getFirebaseProjectId();
  const [headerB64, payloadB64, signatureB64] = token.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new AdminAuthError("Invalid or expired token.");
  }

  const header = decodeJwtPart<FirebaseJwtHeader>(headerB64);
  const payload = decodeJwtPart<FirebaseJwtPayload>(payloadB64);

  if (payload.exp * 1000 < Date.now()) {
    throw new AdminAuthError("Invalid or expired token.");
  }
  if (payload.aud !== projectId) {
    throw new AdminAuthError("Invalid or expired token.");
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new AdminAuthError("Invalid or expired token.");
  }

  const keys = await getFirebasePublicKeys();
  const certPem = keys[header.kid ?? ""];
  if (!certPem) {
    throw new AdminAuthError("Invalid or expired token.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = Buffer.from(signatureB64, "base64url");
  if (!verifier.verify(certPem, signature)) {
    throw new AdminAuthError("Invalid or expired token.");
  }

  return payload.sub;
}

async function isFirestoreAdmin(uid: string): Promise<boolean> {
  if (isAdminUid(uid)) return true;

  try {
    const db = getFirebaseAdminDb();
    const [adminSnap, configSnap] = await Promise.all([
      db.collection("admins").doc(uid).get(),
      db.collection("config").doc("app").get(),
    ]);
    const configUid = configSnap.data()?.adminUid as string | undefined;
    return adminSnap.exists || configUid === uid;
  } catch {
    return isAdminUid(uid);
  }
}

/** Verify Firebase ID token and ensure caller is the app admin. */
export async function requireAdminRequest(
  request: Request,
): Promise<{ uid: string }> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AdminAuthError("Missing authorization token.");
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    throw new AdminAuthError("Missing authorization token.");
  }

  let uid: string;
  try {
    uid = await verifyFirebaseIdToken(token);
  } catch (error) {
    if (error instanceof AdminAuthError) throw error;
    throw new AdminAuthError(
      "Invalid or expired token. Sign out and sign in again.",
    );
  }

  const adminUid = getAdminUid();
  if (adminUid && uid === adminUid) {
    return { uid };
  }

  if (!(await isFirestoreAdmin(uid))) {
    throw new AdminAuthError("Admin access required.", 403);
  }

  return { uid };
}
