import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/tokens.css";
import "@/styles/primitives.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Figura Studio",
  description: "A quiet, focused space for figure and anatomy study.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
