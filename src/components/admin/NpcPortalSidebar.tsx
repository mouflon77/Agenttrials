"use client";

import Link from "next/link";
import type { NpcItem, PortalItem } from "@/types/room";
import type { TilesetDocument } from "@/types/room";
import type { AgentWalletDocument } from "@/types/agent-wallet";
import { formatAgentWalletLabel } from "@/lib/firestore/agent-wallets";

interface NpcPortalSidebarProps {
  mode: "npc" | "portal";
  painting: boolean;
  npcName: string;
  npcPrompt: string;
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
}

export function NpcPortalSidebar({
  mode,
  painting,
  npcName,
  npcPrompt,
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
}: NpcPortalSidebarProps) {
  if (mode === "npc") {
    return (
      <div className="mb-4 space-y-3">
        <p className="text-[10px] text-zinc-500">
          Pick a standee sprite, set name and AI prompt, then click the floor to
          place. Click an existing NPC to edit.
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
        <label className="text-xs text-zinc-400">NPC name</label>
        <input
          type="text"
          value={npcName}
          onChange={(e) => onNpcNameChange(e.target.value)}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
        />
        <label className="text-xs text-zinc-400">Negotiation prompt</label>
        <textarea
          value={npcPrompt}
          onChange={(e) => onNpcPromptChange(e.target.value)}
          rows={4}
          className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
          placeholder="What must the player say or do to unlock the portal?"
        />
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
        {selectedNpcId && (
          <button
            type="button"
            disabled={painting}
            onClick={onSaveNpcFields}
            className="w-full rounded-lg border border-zinc-600 py-2 text-xs hover:bg-zinc-800 disabled:opacity-50"
          >
            Save NPC fields
          </button>
        )}
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
      <label className="text-xs text-zinc-400">Target room id</label>
      <input
        type="text"
        value={portalTarget}
        onChange={(e) => onPortalTargetChange(e.target.value)}
        className="w-full rounded bg-zinc-800 px-2 py-1.5 text-xs"
        placeholder="room_02"
      />
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
