"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme/theme-toggle";
import { Separator } from "~/components/ui/separator";
import { useAuthStore } from "~/store/auth-store";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface AppShellProps {
  children: React.ReactNode;
}

const navigationItems = [
  {
    title: "Панель",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Транзакции",
    href: "/transactions",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "Пользователи",
    href: "/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Настройки",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
  },
];

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Закрыть боковую панель при изменении маршрута (на мобильных устройствах)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Мобильный оверлей */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Боковая панель */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: isSidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card px-3 py-4 shadow-sm lg:relative lg:flex lg:translate-x-0",
          !isSidebarOpen && "hidden lg:flex"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Заголовок */}
          <div className="flex items-center justify-between px-2 pb-2">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              WorkTracker
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <Separator className="mb-4" />

          {/* Навигация */}
          <nav className="flex-1 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.icon}
                {item.title}
              </Link>
            ))}
          </nav>

          {/* Футер */}
          <div className="mt-auto space-y-4">
            <Separator />
            <div className="flex items-center justify-between px-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Основное содержимое */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Верхняя панель */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1 lg:pl-8">
            <h1 className="text-xl font-semibold text-primary">
              {navigationItems.find((item) => pathname.includes(item.href))?.title || "Панель управления"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Содержимое страницы */}
        <main className="flex-1 overflow-y-auto py-6 px-4 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}