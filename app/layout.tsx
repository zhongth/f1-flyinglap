import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const f1Regular = localFont({
  src: "./assets/fonts/Formula1-Regular_web_0.ttf",
  variable: "--font-f1-regular",
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

const northwell = localFont({
  src: "./assets/fonts/Northwell.ttf",
  variable: "--font-northwell",
  weight: "400",
  display: "swap",
});

const titillium = localFont({
  src: [
    {
      path: "./assets/fonts/TitilliumWeb-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./assets/fonts/TitilliumWeb-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./assets/fonts/TitilliumWeb-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./assets/fonts/TitilliumWeb-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./assets/fonts/TitilliumWeb-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-titillium",
  display: "swap",
});

export const metadata: Metadata = {
  title: "F1 Flying Lap | Teammate Qualifying Gap",
  description:
    "Compare F1 teammates' median qualifying gaps with stunning visualizations",
  keywords: ["F1", "Formula 1", "qualifying", "statistics", "comparison"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${f1Regular.variable} ${f1Bold.variable} ${f1Wide.variable} ${northwell.variable} ${titillium.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
