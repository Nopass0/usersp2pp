"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth-store";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme/theme-toggle";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Короткая задержка для инициализации состояния аутентификации
      const timer = setTimeout(() => {
        console.log("Auth status:", { isAuthenticated, user });
        
        if (isAuthenticated && user) {
          // Проверяем роль пользователя для определения куда перенаправить
          if (user.role === "USERCARDS") {
            router.push("/cards");
          } else {
            router.push("/dashboard");
          }
        } else {
          router.push("/login");
        }
        
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    } catch (err) {
      console.error("Redirect error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, [isAuthenticated, router, user]);

  // Показываем загрузочный экран во время редиректа
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  // Если возникла ошибка, показываем сообщение
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="max-w-md space-y-4 rounded-lg border border-destructive/20 bg-card p-6 shadow-lg">
          <h1 className="text-xl font-bold text-destructive">Произошла ошибка</h1>
          <p>{error}</p>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => router.push("/login")}>
              Перейти на страницу входа
            </Button>
            <Button onClick={() => window.location.reload()}>
              Перезагрузить страницу
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // По умолчанию показываем простую страницу
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-bold">WorkTracker</h1>
        <p className="text-muted-foreground">Перенаправление...</p>
        <div className="flex justify-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/login")}>
            Перейти на страницу входа
          </Button>
          {user?.role === "USERCARDS" ? (
            <Button onClick={() => router.push("/cards")}>
              Перейти на страницу карт
            </Button>
          ) : (
            <Button onClick={() => router.push("/dashboard")}>
              Перейти на дашборд
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}