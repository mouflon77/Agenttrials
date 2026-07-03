"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { formatTwitterHandle } from "@/lib/twitter";

type UserProfileBarProps = {
  className?: string;
  variant?: "light" | "dark";
};

export function UserProfileBar({
  className = "",
  variant = "dark",
}: UserProfileBarProps) {
  const { user, userProfile, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const photoURL = userProfile?.photoURL ?? user.photoURL;
  const handle = formatTwitterHandle(user, userProfile);
  const displayName = userProfile?.displayName ?? user.displayName;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isLight = variant === "light";
  const chipClass = isLight
    ? "border-zinc-200 bg-white hover:bg-zinc-50"
    : "border-zinc-700/80 bg-zinc-900/80 hover:bg-zinc-800/90";
  const handleClass = isLight ? "text-zinc-900" : "text-zinc-100";
  const subClass = isLight ? "text-zinc-500" : "text-zinc-500";
  const signOutClass = isLight
    ? "border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    : "border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200";
  const fallbackAvatarClass = isLight
    ? "bg-zinc-200 text-zinc-700"
    : "bg-zinc-700 text-zinc-200";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Link
        href="/profile"
        className={`hidden rounded-lg border px-2.5 py-1.5 text-[11px] sm:inline-block ${signOutClass}`}
      >
        Avatar
      </Link>
      <Link
        href="/dashboard"
        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 pr-3 backdrop-blur ${chipClass}`}
      >
        {photoURL ? (
          <Image
            src={photoURL}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${fallbackAvatarClass}`}
          >
            {(handle ?? displayName ?? "?").replace(/^@/, "").charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 text-left">
          {handle && (
            <p className={`truncate text-xs font-medium ${handleClass}`}>{handle}</p>
          )}
          {displayName && handle !== displayName && (
            <p className={`truncate text-[10px] ${subClass}`}>{displayName}</p>
          )}
          {!handle && !displayName && (
            <p className={`text-xs ${subClass}`}>Signed in</p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${signOutClass}`}
      >
        Sign out
      </button>
    </div>
  );
}
