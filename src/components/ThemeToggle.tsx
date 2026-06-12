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
        "flex items-center gap-2 rounded-lg transition-all duration-200 border",
        size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
        isDark
          ? "text-neon-cyan border-neon-cyan/20 bg-neon-cyan/5 hover:bg-neon-cyan/10 hover:border-neon-cyan/40"
          : "text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40",
        className
      )}
      title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {isDark ? (
        <>
          <Sun className={cn("transition-transform", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <span>Modo Claro</span>
        </>
      ) : (
        <>
          <Moon className={cn("transition-transform", size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4")} />
          <span>Modo Escuro</span>
        </>
      )}
    </button>
  );
}
