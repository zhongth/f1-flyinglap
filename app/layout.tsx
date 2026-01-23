import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const f1Regular = localFont({
  src: "./assets/fonts/Formula1-Regular_web_0.ttf",
  variable: "--font-f1-reg",
  weight: "400",
  display: "swap",
});

const f1Bold = localFont({
  src: "./assets/fonts/Formula1-Bold_web_0.ttf",
  variable: "--font-f1-bold",
  weight: "700",
  display: "swap",
});

const f1Wide = localFont({
  src: "./assets/fonts/Formula1-Wide_web_0.ttf",
  variable: "--font-f1-wide",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "F1 Flying Lap | Teammate Comparison",
  description: "High-end Formula 1 teammate comparison tool focusing on median qualifying gaps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${f1Regular.variable} ${f1Bold.variable} ${f1Wide.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
