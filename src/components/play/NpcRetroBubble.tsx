"use client";

interface NpcRetroBubbleProps {
  npcName: string;
  text: string;
  pending?: boolean;
  className?: string;
}

/** Single-line retro RPG speech bubble for the NPC's latest reply. */
export function NpcRetroBubble({
  npcName,
  text,
  pending = false,
  className = "",
}: NpcRetroBubbleProps) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="relative border-4 border-black bg-[#f4e4bc] px-4 py-3 shadow-[4px_4px_0_0_#000]"
        style={{ imageRendering: "pixelated" }}
      >
        <p className="mb-1 font-mono text-[9px] font-black uppercase tracking-[0.2em] text-[#5c3d1e]">
          {npcName}
        </p>
        <p
          className={`font-mono text-sm leading-relaxed text-[#1a1208] ${
            pending ? "animate-pulse italic opacity-80" : ""
          }`}
        >
          {text}
        </p>
        {/* Pixel corner accents */}
        <span
          className="absolute -left-1 -top-1 h-2 w-2 bg-term-yellow"
          aria-hidden
        />
        <span
          className="absolute -right-1 -top-1 h-2 w-2 bg-term-pink"
          aria-hidden
        />
      </div>
      {/* Chunky tail */}
      <div
        className="absolute -bottom-3 left-8 h-0 w-0 border-x-[10px] border-t-[12px] border-x-transparent border-t-black"
        aria-hidden
      />
      <div
        className="absolute -bottom-2 left-8 h-0 w-0 border-x-[8px] border-t-[10px] border-x-transparent border-t-[#f4e4bc]"
        aria-hidden
      />
    </div>
  );
}
