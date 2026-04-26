import type { Metadata, Viewport } from "next";
import { LandingFooter } from "@/app/components/landing-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diplom App Auth",
  description: "Authorization with PostgreSQL and role-based access",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className="flex min-h-svh flex-col bg-[#05021b] text-white antialiased"
    >
      <body className="flex min-h-0 flex-1 flex-col bg-[#05021b] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] text-white antialiased">
        {children}
        <LandingFooter />
      </body>
    </html>
  );
}
