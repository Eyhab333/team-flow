import type { Metadata } from "next";
import { Tajawal } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ThemeProvider } from "@/components/providers/theme-provider";

import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-tajawal",
});

export const metadata: Metadata = {
  title: "Team Flow",
  description: "إدارة مهام الفريق والرؤية المستقبلية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
    >
      <body className={`${tajawal.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <ServiceWorkerRegistration />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
