import type { Metadata } from "next";
import { LandingFooter } from "@/app/components/landing-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diplom App Auth",
  description: "Authorization with PostgreSQL and role-based access",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="flex min-h-screen flex-col bg-[#05021b] text-white antialiased">
        <div className="flex flex-1 flex-col">{children}</div>
        <LandingFooter />
      </body>
    </html>
  );
}
