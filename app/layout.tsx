import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BorgMind Status Dashboard",
  description: "Real-time status for BorgMind unified agent memory system — TipInc AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
