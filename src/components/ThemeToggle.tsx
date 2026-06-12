import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "sm" | "md";
}

export function ThemeToggle({ className, size = "md" }: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-2 rounded-lg transition-all duration-200",
        size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
        isDark
          ? "text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/40"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary",
        className
      )}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {isDark ? (
        <>
          <Sun className={cn("transition-transform", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <span className="hidden sm:inline">Claro</span>
        </>
      ) : (
        <>
          <Moon className={cn("transition-transform", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <span className="hidden sm:inline">Escuro</span>
        </>
      )}
    </button>
  );
}
