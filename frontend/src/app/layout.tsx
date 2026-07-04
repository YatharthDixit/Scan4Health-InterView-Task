import type { Metadata } from "next";
import { Toaster } from "sonner";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Scan4Health · ScanOS",
  description: "Triage patient intake submissions before care.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
