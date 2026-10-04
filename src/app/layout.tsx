import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jb",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SNIPER FC — Console de trading FUT",
  description:
    "Console web de pilotage pour le moteur d'achat/revente FUT : configuration live, stats, logs et historique — sans Discord.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${display.variable} ${mono.variable}`}>
      <body className="noise antialiased">{children}</body>
    </html>
  );
}
