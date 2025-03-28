"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { useAuthStore } from "~/store/auth-store";
import { api } from "~/trpc/react";
import Cookies from "js-cookie";

const formSchema = z.object({
  passCode: z.string().min(1, {
    message: "Пожалуйста, введите код доступа",
  }),
});

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // Инициализация react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passCode: "",
    },
  });

  // Мутация для входа
  const loginMutation = api.auth.login.useMutation({
    onSuccess: (user) => {
      if (user) {
        // Установка данных пользователя в хранилище (это также установит токены в cookies и localStorage)
        login(user);
        
        toast.success("Вход выполнен успешно", {
          description: `Добро пожаловать, ${user.name}!`,
        });
        
        // Даем немного времени для обработки данных перед перенаправлением
        setTimeout(() => {
          router.push("/");
          setIsLoading(false);
        }, 500);
      }
    },
    onError: (error) => {
      toast.error("Ошибка входа", {
        description: error.message,
      });
      setIsLoading(false);
    },
  });

  // Обработчик отправки формы
  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    loginMutation.mutate(values);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none bg-white/5 shadow-lg backdrop-blur-sm">
        <CardHeader className="flex items-center justify-center pb-2">
          <div className="rounded-full bg-primary/10 p-3">
            <LockIcon className="h-6 w-6 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="passCode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Введите код доступа"
                        autoComplete="current-password"
                        {...field}
                        className="bg-white/10 text-white placeholder:text-gray-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Вход..." : "Войти"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
