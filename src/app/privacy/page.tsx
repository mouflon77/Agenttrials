export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-zinc-800 dark:text-zinc-200">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-zinc-500">Last updated: June 30, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          AgentTrials (&quot;we&quot;) operates the Axonometric Sandbox. This
          policy explains what we collect when you sign in with X and optionally
          provide an email address.
        </p>
        <h2 className="text-lg font-medium">Information we collect</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            X profile data provided by Firebase Authentication (display name,
            username, profile image).
          </li>
          <li>
            Optional marketing email you submit at sign-in, stored in Firestore
            with your consent timestamp.
          </li>
          <li>Room editor activity (tile and furniture placements) in Firestore.</li>
        </ul>
        <h2 className="text-lg font-medium">How we use information</h2>
        <p>
          We use your data to authenticate you, save your sandbox room, and—if
          you opt in—send product updates. We do not sell your personal
          information.
        </p>
        <h2 className="text-lg font-medium">Contact</h2>
        <p>Questions: privacy@chewie.io</p>
      </section>
    </main>
  );
}
