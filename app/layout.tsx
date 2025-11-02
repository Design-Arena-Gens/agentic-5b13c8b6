"use client";

import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
