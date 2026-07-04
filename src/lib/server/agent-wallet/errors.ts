function isPermissionDenied(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  return (
    /insufficient permissions|permission denied|PERMISSION_DENIED/i.test(
      message,
    ) || code === "7" || code === "permission-denied"
  );
}

export function mapProvisionError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Wallet provisioning failed.";

  if (/cannot find module '@hpke/i.test(message)) {
    return "Wallet SDK dependency missing (@hpke). Run `npm install` in the project root and restart the dev server.";
  }

  if (isPermissionDenied(error)) {
    if (/secret|gcp|turnkey/i.test(message)) {
      return (
        "GCP Secret Manager access denied. Enable the Secret Manager API, run " +
        "`gcloud auth application-default login`, bootstrap Turnkey secrets " +
        "(see .env.local.example), or set GCP_SERVICE_ACCOUNT_JSON with Secret Manager access."
      );
    }
    return (
      "Server permission denied saving the wallet. Set FIREBASE_SERVICE_ACCOUNT_JSON " +
      "in .env.local for local dev, or ensure App Hosting has a service account with Firestore access."
    );
  }

  if (/GCP_PROJECT_ID is required/i.test(message)) {
    return "GCP_PROJECT_ID is not set. Add it to .env.local (see .env.local.example).";
  }

  return message;
}
