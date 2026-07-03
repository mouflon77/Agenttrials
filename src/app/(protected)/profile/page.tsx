"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserProfileBar } from "@/components/UserProfileBar";
import { AvatarPreview2D } from "@/components/profile/AvatarPreview2D";
import { useAuth } from "@/contexts/AuthContext";
import { useHeadgear } from "@/hooks/useHeadgear";
import { saveAvatarConfig } from "@/lib/firestore/users";
import { seedDefaultHeadgear } from "@/lib/firestore/headgear";
import {
  AVATAR_BODY_COLORS,
  DEFAULT_AVATAR_CONFIG,
  normalizeAvatarConfig,
  type AvatarConfig,
} from "@/types/avatar";

export default function ProfilePage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const { items: headgearItems, loading: headgearLoading } = useHeadgear();
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile?.avatarConfig) {
      setConfig(normalizeAvatarConfig(userProfile.avatarConfig));
    }
  }, [userProfile?.avatarConfig]);

  useEffect(() => {
    if (headgearItems.length === 0 && !headgearLoading) {
      void seedDefaultHeadgear();
    }
  }, [headgearItems.length, headgearLoading]);

  const selectedHeadgear = useMemo(
    () => headgearItems.find((h) => h.id === config.headgearId),
    [headgearItems, config.headgearId],
  );

  const photoURL = userProfile?.photoURL ?? user?.photoURL;

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveAvatarConfig(user.uid, config);
      await refreshProfile();
      setMessage("Avatar saved. Enter a room to see your look in 3D.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              ← Dashboard
            </Link>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Avatar
            </h1>
          </div>
          <UserProfileBar variant="light" />
        </div>
      </header>

      <main className="mx-auto grid max-w-3xl gap-8 px-6 py-10 md:grid-cols-2">
        <section className="flex flex-col items-center gap-4">
          <h2 className="text-sm font-medium text-zinc-500">Preview</h2>
          <AvatarPreview2D
            config={config}
            photoURL={photoURL}
            headgear={selectedHeadgear}
          />
          <p className="text-center text-xs text-zinc-500">
            Your avatar uses an animated 8-direction walk sprite in-game. Body
            color tints the character; your X photo appears as a badge above.
          </p>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Body color
            </h2>
            <div className="flex flex-wrap gap-2">
              {AVATAR_BODY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setConfig((c) => ({ ...c, bodyColor: color }))}
                  className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                    config.bodyColor === color
                      ? "border-zinc-900 ring-2 ring-sky-400 dark:border-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Headgear
            </h2>
            {headgearLoading ? (
              <p className="text-sm text-zinc-500">Loading headgear…</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {headgearItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setConfig((c) => ({ ...c, headgearId: item.id }))
                    }
                    className={`rounded-lg border p-2 text-center text-[10px] ${
                      config.headgearId === item.id
                        ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    {item.textureUrl && item.id !== "none" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.textureUrl}
                        alt=""
                        className="mx-auto mb-1 h-10 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <div className="mx-auto mb-1 flex h-10 items-center justify-center text-zinc-400">
                        —
                      </div>
                    )}
                    <span className="line-clamp-2">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {saving ? "Saving…" : "Save avatar"}
          </button>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </section>
      </main>
    </div>
  );
}
