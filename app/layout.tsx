import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { JetBrains_Mono, Oswald } from "next/font/google";
import { getOrg } from "@/lib/org";
import "./globals.css";

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-oswald",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
});

export async function generateMetadata(): Promise<Metadata> {
  const org = await getOrg();
  return {
    title: { default: org.companyName, template: `%s · ${org.companyName}` },
    description: `${org.companyName} job manager`,
    appleWebApp: { capable: true, title: org.companyShort, statusBarStyle: "black-translucent" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0d10",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const org = await getOrg();
  const brand = {
    "--color-primary": org.colorPrimary,
    "--color-secondary": org.colorSecondary,
  } as CSSProperties;

  return (
    <html lang="en" className={`${oswald.variable} ${jetbrains.variable}`} style={brand}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
