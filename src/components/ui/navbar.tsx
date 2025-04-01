"use client";

import { LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  
  // Мутация для выхода из аккаунта
  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      router.push("/login");
    },
  });

  return (
    <div className="border-b">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">P2PP Система</span>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Выйти из аккаунта</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
