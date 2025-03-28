import { Metadata } from "next";
import { LoginForm } from "~/components/auth/login-form";

export const metadata: Metadata = {
  title: "Вход в систему",
  description: "Введите код доступа для входа в систему",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-white">Авторизация</h1>
          <p className="text-gray-300">
            Введите свой код доступа для входа в систему
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
