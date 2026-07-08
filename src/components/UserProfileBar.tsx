"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { formatTwitterHandle } from "@/lib/twitter";

/** Compact profile chip for play/editor headers — links to /profile. */
export function UserProfileBar({ className = "" }: { className?: string }) {
  const { user, userProfile } = useAuth();

  if (!user) return null;

  const photoURL = userProfile?.photoURL ?? user.photoURL;
  const handle = formatTwitterHandle(user, userProfile);
  const displayName = userProfile?.displayName ?? user.displayName;
  const label = handle ?? (displayName ? `@${displayName}` : "@OPERATOR");
  const shortId = user.uid.slice(0, 4).toUpperCase();

  return (
    <Link
      href="/profile"
      className={`terminal-bezel flex items-center gap-2 rounded border-zinc-700 bg-zinc-900 p-1 pr-3 transition hover:brightness-110 sm:gap-3 sm:pr-4 ${className}`}
    >
      <div className="h-8 w-8 overflow-hidden rounded border-2 border-term-yellow bg-black sm:h-10 sm:w-10">
        {photoURL ? (
          <Image
            src={photoURL}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover contrast-125 grayscale"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] font-bold text-term-yellow">
            {label.replace(/^@/, "").charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="hidden min-w-0 flex-col sm:flex">
        <span className="truncate text-xs font-bold uppercase tracking-wider text-term-yellow">
          {label.startsWith("@") ? label : `@${label}`}
        </span>
        <span className="font-mono text-[9px] text-zinc-500">ID_{shortId}-X</span>
      </div>
    </Link>
  );
}

/** Sign out control — used on profile page only. */
export function TerminalSignOutButton({ className = "" }: { className?: string }) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className={`chunky-btn rounded px-6 py-3 text-xs text-white ${className}`}
    >
      Sign Out
    </button>
  );
}
