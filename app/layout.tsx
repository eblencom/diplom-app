import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
