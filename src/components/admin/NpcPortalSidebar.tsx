"use client";

import Link from "next/link";
import type {
  GatekeeperStats,
  NpcItem,
  PortalItem,
  RoomListItem,
  TilesetDocument,
} from "@/types/room";
import { formatRoomLabel, GATEKEEPER_STAT_META } from "@/types/room";
import type { AgentWalletDocument } from "@/types/agent-wallet";
import { formatAgentWalletLabel } from "@/lib/firestore/agent-wallets";

interface NpcPortalSidebarProps {
  mode: "npc" | "portal";
  painting: boolean;
  npcName: string;
  npcPrompt: string;
  npcRole: string;
  npcConversationalStyle: string;
  npcSignatureQuirks: string;
  npcPassKeywords: string;
  npcPassHint: string;
  npcStats: GatekeeperStats;
  npcWalletAddress: string;
  npcBribeAmountSol: string;
  portalTarget: string;
  portalSpawnX: number;
  portalSpawnZ: number;
  selectedNpcId: string | null;
  selectedPortalId: string | null;
  npcs: NpcItem[];
  portals: PortalItem[];
  agentWallets: AgentWalletDocument[];
  agentWalletsLoading: boolean;
  selectedAgentWalletId: string;
  standeePalette: Array<[string, TilesetDocument]>;
  selectedStandeeId: string;
  onSelectStandee: (id: string) => void;
  onNpcNameChange: (value: string) => void;
  onNpcPromptChange: (value: string) => void;
  onNpcRoleChange: (value: string) => void;
  onNpcConversationalStyleChange: (value: string) => void;
  onNpcSignatureQuirksChange: (value: string) => void;
  onNpcPassKeywordsChange: (value: string) => void;
  onNpcPassHintChange: (value: string) => void;
  onNpcStatChange: (key: keyof GatekeeperStats, value: number) => void;
  onNpcBribeAmountSolChange: (value: string) => void;
  onSelectAgentWallet: (walletId: string) => void;
  onPortalTargetChange: (value: string) => void;
  onPortalSpawnXChange: (value: number) => void;
  onPortalSpawnZChange: (value: number) => void;
  onSelectNpc: (id: string) => void;
  onSelectPortal: (id: string) => void;
  onRemoveNpc: (id: string) => void;
  onRemovePortal: (id: string) => void;
  onSaveNpcFields: () => void;
  onSavePortalFields: () => void;
  /** True when form differs from last saved gatekeeper snapshot. */
  npcDirty?: boolean;
  npcSaveSuccess?: string | null;
  /** Existing floors for portal target picker. */
  roomList?: RoomListItem[];
  currentRoomId?: string;
}

export function NpcPortalSidebar({
  mode,
  painting,
  npcName,
  npcPrompt,
  npcRole,
  npcConversationalStyle,
  npcSignatureQuirks,
  npcPassKeywords,
  npcPassHint,
  npcStats,
  npcWalletAddress,
  npcBribeAmountSol,
  portalTarget,
  portalSpawnX,
  portalSpawnZ,
  selectedNpcId,
  selectedPortalId,
  npcs,
  portals,
  agentWallets,
  agentWalletsLoading,
  selectedAgentWalletId,
  standeePalette,
  selectedStandeeId,
  onSelectStandee,
  onNpcNameChange,
  onNpcPromptChange,
  onNpcRoleChange,
  onNpcConversationalStyleChange,
  onNpcSignatureQuirksChange,
  onNpcPassKeywordsChange,
  onNpcPassHintChange,
  onNpcStatChange,
  onNpcBribeAmountSolChange,
  onSelectAgentWallet,
  onPortalTargetChange,
  onPortalSpawnXChange,
  onPortalSpawnZChange,
  onSelectNpc,
  onSelectPortal,
  onRemoveNpc,
  onRemovePortal,
  onSaveNpcFields,
  onSavePortalFields,
  npcDirty = false,
  npcSaveSuccess = null,
  roomList = [],
  currentRoomId,
}: NpcPortalSidebarProps) {
  const selectedNpc = selectedNpcId
    ? npcs.find((npc) => npc.id === selectedNpcId)
    : undefined;

  if (mode === "npc") {
    return (
      <div className="mb-4 space-y-3">
        <p className="text-[10px] text-zinc-500">
          Set name, voice, disposition, and stats, then click the floor to place
          a new gatekeeper — or select one below / in the room to edit and save.
        </p>
        <label className="text-xs text-zinc-400">Standee sprite</label>
        <div className="grid max-h-32 grid-cols-3 gap-1 overflow-y-auto">
          {standeePalette.map(([id, tile]) => (
            <button
              key={id}
              type="button"
              onClick={() => onSelectStandee(id)}
              className={`rounded border p-1 text-[9px] ${
                selectedStandeeId === id
                  ? "border-sky-500 bg-sky-950/40"
                  : "border-zinc-700 bg-zinc-800"
              }`}
            >
              {tile.textureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tile.textureUrl}
                  alt={tile.name}
                  className="mx-auto h-10 w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="mx-auto flex h-10 items-center justify-center bg-zinc-700 text-zinc-400">
                  ?
                </div>
              )}
              <span className="mt-1 block truncate">{tile.name}</span>
            </button>
          ))}
        </div>

        {selectedNpc ? (
          <div className="rounded-lg border border-sky-900/50 bg-sky-950/30 px-2 py-1.5">
            <p className="text-[10px] font-medium text-sky-200">
              Editing: {selectedNpc.name}
            </p>
            <p className="text-[10px] text-sky-300/70">
              @ ({selectedNpc.x}, {selectedNpc.z})
              {npcDirty ? " · unsaved changes" : ""}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] text-zinc-500">
            No gatekeeper selected — pick one from the list below or click their
            standee in the room.
          </p>
        )}

        <label className="text-xs text-zinc-400">Gatekeeper name</label>
        <input
          type="text"
          value={npcName}
          onChange={(e) => onNpcNameChange(e.target.value)}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="The Administrative Assistant"
        />
        <label className="text-xs text-zinc-400">Role / perspective</label>
        <textarea
          value={npcRole}
          onChange={(e) => onNpcRoleChange(e.target.value)}
          rows={2}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="A snarky, tech-savvy startup co-founder guarding the floor."
        />
        <label className="text-xs text-zinc-400">Conversational style</label>
        <input
          type="text"
          value={npcConversationalStyle}
          onChange={(e) => onNpcConversationalStyleChange(e.target.value)}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="Blunt, dry humor, casual — not corporate."
        />
        <label className="text-xs text-zinc-400">Signature quirks & idioms</label>
        <textarea
          value={npcSignatureQuirks}
          onChange={(e) => onNpcSignatureQuirksChange(e.target.value)}
          rows={2}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="Yeah, Got it, Look — natural openers instead of robotic filler."
        />
        <label className="text-xs text-zinc-400">Disposition / conditions</label>
        <p className="text-[9px] leading-relaxed text-zinc-600">
          Generated fresh for each new game from the personality fields above.
          Optional fallback template if AI generation is unavailable.
        </p>
        <textarea
          value={npcPrompt}
          onChange={(e) => onNpcPromptChange(e.target.value)}
          rows={3}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="Bored, protective of their time, and expects you to be demanding."
        />
        <div className="space-y-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-amber-400/90">
            Portal pass puzzle
          </p>
          <p className="text-[9px] leading-relaxed text-amber-200/70">
            Keywords, hint, and stats are randomized per new game from the NPC
            personality. Templates below are fallbacks only.
          </p>
          <label className="text-xs text-zinc-400">
            Pass keywords (comma-separated)
          </label>
          <input
            type="text"
            value={npcPassKeywords}
            onChange={(e) => onNpcPassKeywordsChange(e.target.value)}
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
            placeholder="respect, patience, understand"
          />
          <p className="text-[9px] text-zinc-600">
            If the player&apos;s message contains any keyword, the portal opens
            immediately (case-insensitive).
          </p>
          <label className="text-xs text-zinc-400">Hint (shown when they ask)</label>
          <textarea
            value={npcPassHint}
            onChange={(e) => onNpcPassHintChange(e.target.value)}
            rows={3}
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
            placeholder="Tell me you respect my time and you're willing to be patient..."
          />
          <p className="text-[9px] text-zinc-600">
            Used when the player says &quot;hint&quot;, &quot;clue&quot;, etc.
            Give a real answer, not a dodge.
          </p>
        </div>
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            Negotiation stats (0–100)
          </p>
          <p className="text-[9px] leading-relaxed text-zinc-600">
            Scaled by floor level each new game. Editor values are fallbacks.
          </p>
          {GATEKEEPER_STAT_META.map(({ key, label, hint }) => (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] text-zinc-300" title={hint}>
                  {label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={npcStats[key]}
                  onChange={(e) =>
                    onNpcStatChange(key, Number(e.target.value))
                  }
                  className="w-14 rounded bg-zinc-800 px-1.5 py-1 text-right text-[11px] tabular-nums"
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={npcStats[key]}
                onChange={(e) => onNpcStatChange(key, Number(e.target.value))}
                className="w-full accent-sky-500"
              />
              <p className="text-[9px] text-zinc-600">{hint}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            disabled={painting || !selectedNpcId}
            onClick={onSaveNpcFields}
            className="w-full rounded-lg bg-sky-600 py-2.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {painting
              ? "Saving…"
              : selectedNpcId
                ? npcDirty
                  ? "Save gatekeeper"
                  : "Save gatekeeper (no changes)"
                : "Select a gatekeeper to save"}
          </button>
          {npcSaveSuccess ? (
            <p className="text-[10px] text-emerald-400">{npcSaveSuccess}</p>
          ) : null}
          {!selectedNpcId ? (
            <p className="text-[10px] text-zinc-600">
              New placements save when you click the floor. To update an existing
              gatekeeper, select them first, then save.
            </p>
          ) : null}
        </div>

        <p className="text-[10px] text-zinc-500">
          Optional bribe — create an agent wallet in{" "}
          <Link href="/admin/wallets" className="text-sky-400 hover:underline">
            Admin → Agent wallets
          </Link>
          , register your phone on the guardian link, then assign it below.
        </p>
        <label className="text-xs text-zinc-400">Agent wallet</label>
        <select
          value={selectedAgentWalletId}
          onChange={(e) => onSelectAgentWallet(e.target.value)}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
        >
          <option value="">None (persuasion only)</option>
          {agentWalletsLoading ? (
            <option disabled>Loading wallets…</option>
          ) : (
            agentWallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {formatAgentWalletLabel(wallet)}
              </option>
            ))
          )}
        </select>
        {npcWalletAddress ? (
          <p className="font-mono text-[10px] break-all text-zinc-500">
            {npcWalletAddress}
          </p>
        ) : null}
        <label className="text-xs text-zinc-400">Bribe amount (SOL)</label>
        <input
          type="number"
          min={0}
          step={0.01}
          value={npcBribeAmountSol}
          onChange={(e) => onNpcBribeAmountSolChange(e.target.value)}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="0.1"
        />
        {npcs.length > 0 && (
          <ul className="space-y-1 border-t border-zinc-800 pt-2">
            {npcs.map((npc) => (
              <li
                key={npc.id}
                className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${
                  selectedNpcId === npc.id ? "bg-blue-950/50" : "bg-zinc-900"
                }`}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => onSelectNpc(npc.id)}
                >
                  {npc.name} @ ({npc.x}, {npc.z})
                </button>
                <button
                  type="button"
                  disabled={painting}
                  onClick={() => onRemoveNpc(npc.id)}
                  className="text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 space-y-3">
      <p className="text-[10px] text-zinc-500">
        Click an edge tile (border of the 12×12 grid) to place a portal. Players
        must negotiate with an NPC to unlock it.
      </p>
      <label className="text-xs text-zinc-400">Target floor</label>
      <select
        value={
          roomList.some((room) => room.id === portalTarget)
            ? portalTarget
            : "__custom__"
        }
        onChange={(e) => {
          if (e.target.value === "__custom__") return;
          onPortalTargetChange(e.target.value);
        }}
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
      >
        <option value="__custom__">Custom id…</option>
        {roomList
          .filter((room) => room.id !== currentRoomId)
          .map((room) => (
            <option key={room.id} value={room.id}>
              {formatRoomLabel(room)}
            </option>
          ))}
      </select>
      <input
        type="text"
        value={portalTarget}
        onChange={(e) => onPortalTargetChange(e.target.value)}
        className="w-full rounded bg-zinc-800 px-2 py-1.5 font-mono text-xs"
        placeholder="room_02"
      />
      <p className="text-[10px] text-zinc-500">
        Portal unlocks travel to another floor. Create the target floor first if
        it does not exist yet.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-zinc-400">Spawn X</label>
          <input
            type="number"
            min={0}
            max={11}
            value={portalSpawnX}
            onChange={(e) => onPortalSpawnXChange(Number(e.target.value))}
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-400">Spawn Z</label>
          <input
            type="number"
            min={0}
            max={11}
            value={portalSpawnZ}
            onChange={(e) => onPortalSpawnZChange(Number(e.target.value))}
            className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          />
        </div>
      </div>
      {selectedPortalId && (
        <button
          type="button"
          disabled={painting}
          onClick={onSavePortalFields}
          className="w-full rounded-lg border border-zinc-600 py-2 text-xs hover:bg-zinc-800 disabled:opacity-50"
        >
          Save portal settings
        </button>
      )}
      {portals.length > 0 && (
        <ul className="space-y-1 border-t border-zinc-800 pt-2">
          {portals.map((portal) => (
            <li
              key={portal.id}
              className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${
                selectedPortalId === portal.id ? "bg-blue-950/50" : "bg-zinc-900"
              }`}
            >
              <button
                type="button"
                className="flex-1 truncate text-left"
                onClick={() => onSelectPortal(portal.id)}
              >
                → {portal.targetRoomId} @ ({portal.x}, {portal.z})
              </button>
              <button
                type="button"
                disabled={painting}
                onClick={() => onRemovePortal(portal.id)}
                className="text-red-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
