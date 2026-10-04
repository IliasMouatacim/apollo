import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo",
  description: "Your personal premium music streaming platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="app-container">
          {children}
        </main>
      </body>
    </html>
  );
}
