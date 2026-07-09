"use client";

type HeadgearSize = "xs" | "sm" | "lg";

const SIZE_CLASS: Record<HeadgearSize, string> = {
  lg: "h-12 w-14",
  sm: "h-10 w-12",
  xs: "h-7 w-9",
};

export function HeadgearPreviewIcon({
  headgearId,
  size = "sm",
}: {
  headgearId: string;
  size?: HeadgearSize;
}) {
  const dim = SIZE_CLASS[size];

  if (headgearId === "none") {
    return (
      <div
        className={`flex ${size === "xs" ? "h-7" : "h-10"} w-full items-center justify-center text-zinc-600`}
      >
        ∅
      </div>
    );
  }

  if (headgearId === "cap_red" || headgearId === "cap_blue") {
    const fill = headgearId === "cap_red" ? "#c62828" : "#1565c0";
    return (
      <svg viewBox="0 0 48 32" className={`mx-auto ${dim}`} aria-hidden>
        <ellipse cx="24" cy="14" rx="16" ry="10" fill={fill} />
        <rect x="8" y="20" width="32" height="5" rx="1" fill={fill} opacity="0.9" />
        <rect
          x="18"
          y="22"
          width="20"
          height="4"
          rx="1"
          fill={headgearId === "cap_red" ? "#8b0000" : "#0d47a1"}
        />
      </svg>
    );
  }

  if (headgearId === "crown") {
    return (
      <svg viewBox="0 0 48 32" className={`mx-auto ${dim}`} aria-hidden>
        <ellipse cx="24" cy="18" rx="17" ry="5" fill="none" stroke="#ffd54f" strokeWidth="3" />
        <polygon points="8,18 14,6 24,14 34,6 40,18" fill="#ffc107" />
      </svg>
    );
  }

  if (headgearId === "horns") {
    return (
      <svg viewBox="0 0 48 32" className={`mx-auto ${dim}`} aria-hidden>
        <polygon points="6,20 12,4 16,18" fill="#6d4c41" />
        <polygon points="42,20 36,4 32,18" fill="#6d4c41" />
      </svg>
    );
  }

  return null;
}
