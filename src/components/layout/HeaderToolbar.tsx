import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function HeaderToolbar({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      {children}
    </div>
  );
}
