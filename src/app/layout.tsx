// ~/app/layout.tsx
import "~/styles/globals.css";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "~/components/theme/theme-provider";
import { Navbar } from "~/components/ui/navbar";
import { NotificationWrapper } from "~/components/layout/notification-wrapper";
import { EmergencyNotification } from "~/components/ui/emergency-notification";

export const metadata: Metadata = {
  title: "Панель управления",
  description: "Система управления рабочими сессиями",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${geist.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <NotificationWrapper>
              <div className="relative flex min-h-screen flex-col">
                <Navbar />
                <div className="flex-1">{children}</div>
                <EmergencyNotification />
              </div>
              <Toaster richColors />
            </NotificationWrapper>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}