
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      className={`w-9 p-0 border-yawatu-gold/30 transition-all duration-300 ${
        theme === "dark" 
          ? "bg-gray-900 text-yawatu-gold hover:bg-gray-800" 
          : "bg-white text-gray-900 hover:bg-gray-100"
      }`}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-300 rotate-0 scale-100" />
      )}
    </Button>
  );
};

export default ThemeToggle;
