export function getGcpProjectId(): string {
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error(
      "GCP_PROJECT_ID is required. Set it to your Firebase/GCP project id (e.g. agenttrials-xo).",
    );
  }
  return projectId;
}

export function getAutoSignThresholdSol(): number {
  return Number(process.env.AUTO_SIGN_THRESHOLD_SOL ?? "0.5");
}

export function getAppOrigin(): string {
  const origin =
    process.env.APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (origin) return origin.replace(/\/$/, "");

  // Legacy Vercel deploy fallback — prefer explicit APP_ORIGIN on App Hosting.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
