// ~/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Пути, которые не требуют аутентификации
const publicPaths = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Проверка, является ли путь публичным
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // Получение токена аутентификации из cookies
  const authToken = request.cookies.get("auth_token")?.value;
  
  // Если пользователь не авторизован и пытается получить доступ к защищенному пути
  if (!authToken && !isPublicPath) {
    // Создаем URL для перенаправления на страницу входа
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Если пользователь авторизован и пытается получить доступ к странице входа
  if (authToken && isPublicPath) {
    // Перенаправляем на дашборд
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }
  
  // В других случаях продолжаем обычный поток
  return NextResponse.next();
}

// Применяем middleware только к определенным путям
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};