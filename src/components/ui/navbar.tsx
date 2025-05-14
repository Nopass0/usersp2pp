"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "~/components/theme/theme-provider";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useAuthStore } from "~/store/auth-store";
import NotificationBell from "~/components/ui/notification-bell";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuthStore();
  const router = useRouter();
  
  // Обработчик выхода из системы
  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="border-b">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">P2PP Система</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
                <span className="sr-only">Переключить тему</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                Светлая
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                Тёмная
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                Системная
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Выйти из аккаунта</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
