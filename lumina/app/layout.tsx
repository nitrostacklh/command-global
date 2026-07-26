import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tangent | Find Where Your Thinking Changed",
  description: "Futuristic intelligent learning platform for tracing software architectural implementation drift.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#020617] text-white min-h-screen font-sans overflow-hidden">{children}</body>
    </html>
  );
}
