import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudySir — Connect Students & Teachers",
  description:
    "StudySir is a Facebook-style tuition marketplace where students and parents post tuition requests and teachers connect using coins. Post tuition free, chat, hire, buy courses and digital study materials.",
  keywords: ["StudySir", "tuition", "tutor", "teacher", "students", "marketplace", "courses"],
  authors: [{ name: "StudySir" }],
  openGraph: {
    title: "StudySir — Connect Students & Teachers",
    description: "Facebook-style tuition marketplace. Post tuition free, hire teachers with coins.",
    siteName: "StudySir",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
