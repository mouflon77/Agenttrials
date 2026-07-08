"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TerminalShell } from "@/components/terminal/TerminalShell";
import { TerminalSignOutButton } from "@/components/UserProfileBar";
import { AvatarPreview2D } from "@/components/profile/AvatarPreview2D";
import { useAuth } from "@/contexts/AuthContext";
import { useHeadgear } from "@/hooks/useHeadgear";
import { saveAvatarConfig } from "@/lib/firestore/users";
import { seedDefaultHeadgear } from "@/lib/firestore/headgear";
import {
  AVATAR_BODY_COLORS,
  DEFAULT_AVATAR_CONFIG,
  SKIN_TONES,
  normalizeAvatarConfig,
  type AvatarConfig,
} from "@/types/avatar";
import { HeadgearPreviewIcon } from "@/components/profile/HeadgearPreviewIcon";

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

  const photoURL = userProfile?.photoURL ?? user?.photoURL;
  const hasPhoto = Boolean(photoURL?.trim());
  const displayName =
    userProfile?.displayName ?? userProfile?.twitterHandle ?? "OPERATOR";

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveAvatarConfig(user.uid, config);
      await refreshProfile();
      setMessage("AVATAR_SAVED — enter a room to see your look in 3D.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save avatar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TerminalShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="border-l-4 border-term-yellow py-2 pl-4">
          <p className="font-mono text-sm text-zinc-400">
            &gt; PROFILE_MODULE: <span className="text-white">{displayName}</span>
            <br />
            &gt; PROTOCOL: BIO_EDIT
          </p>
        </div>
        <Link
          href="/dashboard"
          className="chunky-btn rounded px-4 py-2 text-[10px] text-white"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="terminal-bezel flex flex-col items-center gap-4 rounded-xl p-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-term-blue">
            Preview
          </h2>
          <AvatarPreview2D config={config} photoURL={photoURL} />
          <p className="text-center font-mono text-[10px] leading-relaxed text-zinc-500">
            Preset head or profile photo on the sphere. Headgear sits on top in
            3D.
          </p>
        </section>

        <section className="terminal-bezel space-y-6 rounded-xl p-6">
          <div>
            <h2 className="mb-3 text-sm font-black uppercase text-term-yellow">
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
                      ? "border-term-blue ring-2 ring-term-blue/50"
                      : "border-zinc-600"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black uppercase text-term-yellow">
              Head
            </h2>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!hasPhoto}
                onClick={() => setConfig((c) => ({ ...c, headSource: "photo" }))}
                className={`chunky-btn rounded px-4 py-2 text-[10px] ${
                  config.headSource === "photo"
                    ? "border-term-blue bg-term-blue/20 text-white"
                    : "text-zinc-400"
                } ${!hasPhoto ? "opacity-40" : ""}`}
              >
                Profile photo
              </button>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, headSource: "preset" }))}
                className={`chunky-btn rounded px-4 py-2 text-[10px] ${
                  config.headSource === "preset"
                    ? "border-term-blue bg-term-blue/20 text-white"
                    : "text-zinc-400"
                }`}
              >
                Preset head
              </button>
            </div>
            {config.headSource === "preset" && (
              <>
                <p className="mb-2 font-mono text-[10px] text-zinc-500">Gender</p>
                <div className="mb-4 flex gap-2">
                  {(["male", "female"] as const).map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, headGender: gender }))}
                      className={`chunky-btn flex-1 rounded py-2 text-[10px] capitalize ${
                        config.headGender === gender
                          ? "border-term-pink bg-term-pink/15 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
                <p className="mb-2 font-mono text-[10px] text-zinc-500">Skin tone</p>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() =>
                        setConfig((c) => ({ ...c, skinTone: tone.color }))
                      }
                      className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-105 ${
                        config.skinTone === tone.color
                          ? "border-term-yellow ring-2 ring-term-yellow/50"
                          : "border-zinc-600"
                      }`}
                      style={{ backgroundColor: tone.color }}
                      aria-label={tone.label}
                      title={tone.label}
                    />
                  ))}
                </div>
              </>
            )}
            {config.headSource === "photo" && !hasPhoto && (
              <p className="font-mono text-[10px] text-zinc-600">
                No profile photo linked. Use preset head instead.
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black uppercase text-term-yellow">
              Headgear
            </h2>
            {headgearLoading ? (
              <p className="font-mono text-xs text-zinc-500">LOADING_GEAR...</p>
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
                        ? "border-term-blue bg-term-blue/10"
                        : "border-zinc-700 bg-black/40"
                    }`}
                  >
                    <HeadgearPreviewIcon headgearId={item.id} />
                    <span className="line-clamp-2 text-zinc-300">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="chunky-btn btn-glow-green w-full rounded py-3 text-sm font-black"
          >
            {saving ? "WRITING..." : "SAVE AVATAR"}
          </button>
          {message && (
            <p className="font-mono text-xs text-term-green">{message}</p>
          )}
          {error && <p className="font-mono text-xs text-term-red">{error}</p>}
        </section>
      </div>

      <section className="terminal-bezel mt-8 rounded-xl border-term-red/20 p-6">
        <h2 className="mb-2 text-sm font-black uppercase text-term-red">
          Session Control
        </h2>
        <p className="mb-4 font-mono text-[10px] text-zinc-500">
          Terminate your session and return to the login terminal.
        </p>
        <TerminalSignOutButton />
      </section>
    </TerminalShell>
  );
}
