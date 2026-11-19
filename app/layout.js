import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Prompt Analyzer & Optimizer",
  description: "Craft production-ready AI prompts with automated scoring, flaw detection, and Gemini-powered optimization.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
