import { clsx } from "clsx";
import { BottomNav } from "@/components/ui";
import type { NavTab } from "@/components/ui";

interface AppShellProps {
  children: React.ReactNode;
  activeTab?: NavTab;
  className?: string;
}

export function AppShell({ children, activeTab = "home", className }: AppShellProps) {
  return (
    <div className={clsx("app-paper-bg paper-texture min-h-screen", className)}>
      <main className="max-w-[1120px] mx-auto pb-20 relative z-10">
        {children}
      </main>
      <BottomNav active={activeTab} />
    </div>
  );
}
