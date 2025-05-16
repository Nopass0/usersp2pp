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
import { initSoundSystem } from "~/lib/sound-system";

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
  // Initialize the sound system on the client side
  if (typeof window !== 'undefined') {
    // Wait for the document to be ready
    if (document.readyState === 'complete') {
      initSoundSystem();
    } else {
      window.addEventListener('load', () => {
        initSoundSystem();
      });
    }
  }

  return (
    <html lang="ru" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        {/* Add PC beep functionality directly */}
        <script src="/beep.js" />
        {/* Telegram API configuration */}
        <meta name="telegram-api-key" content={process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || ""} />
        <meta name="telegram-api-url" content={process.env.NEXT_PUBLIC_TELEGRAM_API_URL || ""} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.TELEGRAM_API_KEY = "${process.env.NEXT_PUBLIC_TELEGRAM_API_KEY || ""}";
              window.TELEGRAM_API_URL = "${process.env.NEXT_PUBLIC_TELEGRAM_API_URL || ""}";

              // Initialize emergency sound system when page loads
              window.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                  // Try to initialize audio early
                  if (typeof initSoundSystem === 'function') {
                    initSoundSystem();
                  }
                }, 1000);
              });
            `
          }}
        />
        <script src="/direct-http.js" />
      </head>
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