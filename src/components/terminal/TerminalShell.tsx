import { TerminalFooter } from "@/components/terminal/TerminalFooter";
import { TerminalHeader } from "@/components/terminal/TerminalHeader";

interface TerminalShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  mainClassName?: string;
}

export function TerminalShell({
  children,
  showHeader = true,
  showFooter = true,
  mainClassName = "",
}: TerminalShellProps) {
  return (
    <div className="scanlines flex min-h-screen flex-col">
      {showHeader && <TerminalHeader />}
      <main
        className={`container mx-auto max-w-6xl flex-grow px-4 py-8 sm:px-6 ${mainClassName}`}
      >
        {children}
      </main>
      {showFooter && <TerminalFooter />}
    </div>
  );
}
