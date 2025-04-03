import { type Metadata } from "next";
import { LoginForm } from "~/components/auth/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { LockIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Вход в систему",
  description: "Введите код доступа для входа в систему",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-zinc-950 dark:to-zinc-900 px-4 py-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center mb-6">
          <div className="inline-block p-3 rounded-full bg-primary/10 mb-4">
            <LockIcon className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Панель управления</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-2">Система мониторинга и аналитики</p>
        </div>
        
        <Card className="border border-slate-200 dark:border-0 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm shadow-lg dark:shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10 opacity-20 rounded-lg" />
          <CardHeader className="space-y-2 text-center pb-2 relative">
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">Авторизация</CardTitle>
            <CardDescription className="text-slate-600 dark:text-zinc-300">
              Введите свой код доступа для входа в систему
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <LoginForm />
          </CardContent>
        </Card>
        
        <div className="text-center mt-6">
          <p className="text-sm text-slate-400 dark:text-zinc-500">
            &copy; {new Date().getFullYear()} Все права защищены
          </p>
        </div>
      </div>
    </div>
  );
}
