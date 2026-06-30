export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-zinc-800 dark:text-zinc-200">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-4 text-sm text-zinc-500">Last updated: June 30, 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed">
        <p>
          By using AgentTrials Axonometric Sandbox you agree to these terms. If
          you do not agree, do not use the service.
        </p>
        <h2 className="text-lg font-medium">Accounts</h2>
        <p>
          Access requires signing in with X via Firebase Authentication. You are
          responsible for activity under your account.
        </p>
        <h2 className="text-lg font-medium">User content</h2>
        <p>
          You retain rights to sprites and room layouts you upload. You grant us
          a license to host and display that content so the sandbox functions.
        </p>
        <h2 className="text-lg font-medium">Email communications</h2>
        <p>
          If you provide an email address, you consent to receive product-related
          messages. You may opt out at any time by contacting support.
        </p>
        <h2 className="text-lg font-medium">Contact</h2>
        <p>Questions: legal@chewie.io</p>
      </section>
    </main>
  );
}
