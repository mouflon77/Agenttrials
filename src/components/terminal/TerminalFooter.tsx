export function TerminalFooter() {
  return (
    <footer className="p-8 text-center font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-700">
      <span className="text-term-green/30">
        --- HARDENED SECURITY PROTOCOL ACTIVE ---
      </span>
      <br />
      Agent Trials © 1984-2026{" "}
      <a
        href="https://frontiertechjobs.com"
        target="_blank"
        rel="noopener noreferrer"
        className="normal-case tracking-normal text-term-green/60 underline-offset-2 hover:text-term-green hover:underline"
      >
        frontiertechjobs.com
      </a>
    </footer>
  );
}
