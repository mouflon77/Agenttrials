import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getFirebaseAdminDb } from "@/lib/server/firebase-admin";
import { computeGameNegotiationScore } from "@/lib/server/negotiation-score";
import type { GameSaveDocument } from "@/types/game";
import { normalizeAvatarConfig } from "@/types/avatar";
import {
  clampNegotiationScore,
  computeLeaderboardScore,
  normalizeLeagueCode,
  type LeaderboardEntry,
  type LeagueDocument,
  type LeagueMembership,
} from "@/types/league";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function leaguesCollection() {
  return getFirebaseAdminDb().collection("leagues");
}

function leagueRef(leagueId: string) {
  return leaguesCollection().doc(leagueId);
}

function leagueCodeRef(code: string) {
  return getFirebaseAdminDb().collection("leagueCodes").doc(code);
}

function membershipRef(uid: string, leagueId: string) {
  return getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("leagueMemberships")
    .doc(leagueId);
}

function entryRef(leagueId: string, uid: string) {
  return leagueRef(leagueId).collection("entries").doc(uid);
}

function negotiatorRankingRef(uid: string) {
  return getFirebaseAdminDb().collection("negotiatorRankings").doc(uid);
}

function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

function randomCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function codeIsAvailable(code: string): Promise<boolean> {
  const snap = await leagueCodeRef(code).get();
  return !snap.exists;
}

async function allocateLeagueCode(preferred?: string): Promise<string> {
  const normalized = preferred ? normalizeLeagueCode(preferred) : "";
  if (normalized.length >= 4 && (await codeIsAvailable(normalized))) {
    return normalized;
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const code = randomCode(6);
    if (await codeIsAvailable(code)) return code;
  }

  throw new Error("Could not allocate a unique league code.");
}

function normalizeLeague(
  id: string,
  data: Record<string, unknown> | undefined,
): LeagueDocument | null {
  if (!data) return null;
  const name = String(data.name ?? "").trim();
  const code = normalizeLeagueCode(String(data.code ?? ""));
  if (!name || code.length < 4) return null;
  return {
    id,
    name: name.slice(0, 80),
    code,
    active: data.active !== false,
    createdAt: toIso(data.createdAt),
    createdBy: String(data.createdBy ?? ""),
  };
}

async function getUserLeaderboardProfile(uid: string): Promise<{
  displayName: string;
  twitterHandle?: string;
  photoURL?: string;
  avatarConfig?: ReturnType<typeof normalizeAvatarConfig>;
}> {
  const snap = await getFirebaseAdminDb().collection("users").doc(uid).get();
  const data = snap.data() as
    | {
        displayName?: string;
        twitterHandle?: string;
        photoURL?: string;
        avatarConfig?: unknown;
      }
    | undefined;
  const twitterHandle = data?.twitterHandle?.trim();
  const displayName =
    twitterHandle?.replace(/^@/, "") ||
    data?.displayName?.trim() ||
    `Player ${uid.slice(0, 6)}`;
  const photoURL = data?.photoURL?.trim() || undefined;
  const avatarConfig = data?.avatarConfig
    ? normalizeAvatarConfig(data.avatarConfig as Parameters<typeof normalizeAvatarConfig>[0])
    : undefined;

  return {
    displayName: displayName.slice(0, 64),
    ...(twitterHandle ? { twitterHandle: twitterHandle.slice(0, 16) } : {}),
    ...(photoURL ? { photoURL: photoURL.slice(0, 512) } : {}),
    ...(avatarConfig ? { avatarConfig } : {}),
  };
}

export async function listLeagues(): Promise<LeagueDocument[]> {
  const snap = await leaguesCollection().orderBy("createdAt", "desc").get();
  return snap.docs
    .map((d) => normalizeLeague(d.id, d.data()))
    .filter((l): l is LeagueDocument => l != null);
}

export async function getLeagueById(
  leagueId: string,
): Promise<LeagueDocument | null> {
  const snap = await leagueRef(leagueId).get();
  if (!snap.exists) return null;
  return normalizeLeague(snap.id, snap.data());
}

export async function getLeagueByCode(
  code: string,
): Promise<LeagueDocument | null> {
  const normalized = normalizeLeagueCode(code);
  if (normalized.length < 4) return null;
  const codeSnap = await leagueCodeRef(normalized).get();
  if (!codeSnap.exists) return null;
  const leagueId = String(codeSnap.data()?.leagueId ?? "");
  if (!leagueId) return null;
  return getLeagueById(leagueId);
}

export async function createLeague(
  adminUid: string,
  name: string,
  code?: string,
): Promise<LeagueDocument> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("League name is required.");

  const leagueCode = await allocateLeagueCode(code);
  const leagueId = `league_${Date.now()}`;
  const now = FieldValue.serverTimestamp();

  const payload = {
    name: trimmedName.slice(0, 80),
    code: leagueCode,
    active: true,
    createdAt: now,
    createdBy: adminUid,
  };

  const db = getFirebaseAdminDb();
  const batch = db.batch();
  batch.set(leagueRef(leagueId), payload);
  batch.set(leagueCodeRef(leagueCode), { leagueId });
  await batch.commit();

  return {
    id: leagueId,
    name: trimmedName.slice(0, 80),
    code: leagueCode,
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: adminUid,
  };
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const league = await getLeagueById(leagueId);
  if (!league) return;

  const db = getFirebaseAdminDb();
  const entries = await leagueRef(leagueId).collection("entries").listDocuments();
  const batch = db.batch();
  for (const ref of entries) {
    batch.delete(ref);
  }
  batch.delete(leagueCodeRef(league.code));
  batch.delete(leagueRef(leagueId));
  await batch.commit();
}

export async function listUserLeagueMemberships(
  uid: string,
): Promise<LeagueMembership[]> {
  const snap = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("leagueMemberships")
    .orderBy("joinedAt", "desc")
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      leagueId: d.id,
      leagueName: String(data.leagueName ?? ""),
      leagueCode: normalizeLeagueCode(String(data.leagueCode ?? "")),
      gameId: String(data.gameId ?? ""),
      joinedAt: toIso(data.joinedAt),
    };
  });
}

export async function joinLeague(
  uid: string,
  code: string,
  gameId: string,
): Promise<LeagueMembership> {
  const league = await getLeagueByCode(code);
  if (!league) throw new Error("Invalid league code.");
  if (!league.active) throw new Error("This league is not accepting entries.");

  const gameSnap = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("games")
    .doc(gameId)
    .get();
  if (!gameSnap.exists) throw new Error("Saved game not found.");

  const now = FieldValue.serverTimestamp();
  const membership: Record<string, unknown> = {
    leagueId: league.id,
    leagueName: league.name,
    leagueCode: league.code,
    gameId,
    joinedAt: now,
  };

  await membershipRef(uid, league.id).set(membership, { merge: true });

  const gameData = gameSnap.data();
  if (gameData) {
    const { normalizeGameSave } = await import("@/types/game");
    const game = normalizeGameSave(gameId, gameData);
    if (game) {
      await syncLeaderboardEntry(uid, league.id, game);
    }
  }

  return {
    leagueId: league.id,
    leagueName: league.name,
    leagueCode: league.code,
    gameId,
    joinedAt: new Date().toISOString(),
  };
}

export async function syncLeaderboardEntry(
  uid: string,
  leagueId: string,
  game: GameSaveDocument,
): Promise<void> {
  const membershipSnap = await membershipRef(uid, leagueId).get();
  if (!membershipSnap.exists) return;
  const membership = membershipSnap.data();
  if (String(membership?.gameId ?? "") !== game.id) return;

  const profile = await getUserLeaderboardProfile(uid);
  const { floor, score, roomId } = computeLeaderboardScore(game);
  const negotiationScore = await computeGameNegotiationScore(uid, game);

  const payload: Record<string, unknown> = {
    uid,
    displayName: profile.displayName,
    gameId: game.id,
    roomId,
    floor,
    score,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (negotiationScore != null) {
    payload.negotiationScore = negotiationScore;
  } else {
    payload.negotiationScore = FieldValue.delete();
  }
  if (profile.twitterHandle) payload.twitterHandle = profile.twitterHandle;
  if (profile.photoURL) payload.photoURL = profile.photoURL;
  if (profile.avatarConfig) payload.avatarConfig = profile.avatarConfig;

  await entryRef(leagueId, uid).set(payload, { merge: true });
  await syncGlobalNegotiatorRanking(uid, game, negotiationScore, profile, {
    floor,
    roomId,
    score,
  });
}

function mapRankingDoc(
  id: string,
  data: Record<string, unknown> | undefined,
): LeaderboardEntry {
  const avatarConfig = data?.avatarConfig
    ? normalizeAvatarConfig(
        data.avatarConfig as Parameters<typeof normalizeAvatarConfig>[0],
      )
    : undefined;
  return {
    uid: id,
    displayName: String(data?.displayName ?? "Player"),
    twitterHandle: data?.twitterHandle ? String(data.twitterHandle) : undefined,
    photoURL: data?.photoURL ? String(data.photoURL) : undefined,
    ...(avatarConfig ? { avatarConfig } : {}),
    gameId: String(data?.gameId ?? ""),
    roomId: String(data?.roomId ?? ""),
    floor: Number(data?.floor) || 0,
    score: Number(data?.score) || 0,
    ...(Number.isFinite(Number(data?.negotiationScore))
      ? {
          negotiationScore: clampNegotiationScore(
            Number(data?.negotiationScore),
          ),
        }
      : {}),
    updatedAt: toIso(data?.updatedAt),
  };
}

export async function syncGlobalNegotiatorRanking(
  uid: string,
  game: GameSaveDocument,
  negotiationScore?: number | null,
  profile?: Awaited<ReturnType<typeof getUserLeaderboardProfile>>,
  progress?: { floor: number; roomId: string; score: number },
): Promise<void> {
  const score =
    negotiationScore !== undefined
      ? negotiationScore
      : await computeGameNegotiationScore(uid, game);
  if (score == null) return;
  const userProfile = profile ?? (await getUserLeaderboardProfile(uid));
  const computed = computeLeaderboardScore(game);
  const floor = progress?.floor ?? computed.floor;
  const roomId = progress?.roomId ?? computed.roomId;
  const progScore = progress?.score ?? computed.score;

  const existingSnap = await negotiatorRankingRef(uid).get();
  if (existingSnap.exists) {
    const existing = existingSnap.data();
    const existingRaw = Number(existing?.negotiationScore);
    const existingFloor = Number(existing?.floor) || 0;
    if (Number.isFinite(existingRaw)) {
      const existingNeg = clampNegotiationScore(existingRaw);
      if (
        score < existingNeg ||
        (score === existingNeg && floor <= existingFloor)
      ) {
        return;
      }
    }
  }

  const payload: Record<string, unknown> = {
    uid,
    displayName: userProfile.displayName,
    gameId: game.id,
    roomId,
    floor,
    score: progScore,
    negotiationScore: score,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (userProfile.twitterHandle) payload.twitterHandle = userProfile.twitterHandle;
  if (userProfile.photoURL) payload.photoURL = userProfile.photoURL;
  if (userProfile.avatarConfig) payload.avatarConfig = userProfile.avatarConfig;

  await negotiatorRankingRef(uid).set(payload, { merge: true });
}

export async function syncNegotiationScoreForGame(
  uid: string,
  gameId: string,
): Promise<void> {
  const gameSnap = await getFirebaseAdminDb()
    .collection("users")
    .doc(uid)
    .collection("games")
    .doc(gameId)
    .get();
  if (!gameSnap.exists) return;

  const { normalizeGameSave } = await import("@/types/game");
  const game = normalizeGameSave(gameSnap.id, gameSnap.data());
  if (!game) return;

  await syncLeaderboardForGame(uid, game);
  await syncGlobalNegotiatorRanking(uid, game);
}

export async function syncLeaderboardForGame(
  uid: string,
  game: GameSaveDocument,
): Promise<void> {
  const memberships = await listUserLeagueMemberships(uid);
  const relevant = memberships.filter((m) => m.gameId === game.id);
  await Promise.all(
    relevant.map((m) => syncLeaderboardEntry(uid, m.leagueId, game)),
  );
}

export async function getLeaderboard(
  leagueId: string,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const snap = await leagueRef(leagueId)
    .collection("entries")
    .orderBy("score", "desc")
    .orderBy("updatedAt", "asc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => mapRankingDoc(d.id, d.data()));
}

export async function getTopNegotiators(limit = 50): Promise<LeaderboardEntry[]> {
  const snap = await getFirebaseAdminDb()
    .collection("negotiatorRankings")
    .orderBy("negotiationScore", "desc")
    .orderBy("floor", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((d) => mapRankingDoc(d.id, d.data()));
}
