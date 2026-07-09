export function leagueJoinUrl(code: string, origin?: string): string {
  const base =
    origin?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    "";
  return `${base}/leaderboard?join=${encodeURIComponent(code)}`;
}
