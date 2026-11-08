import type { Metadata } from "next";
import { Lilita_One, Nunito } from "next/font/google";
import { SettingsApplier } from "./components/SettingsApplier";
import "./globals.css";

const display = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "SummitRush",
  description: "Bet on yourself. Conquer your goals. Reach the summit.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <SettingsApplier />
        {children}
      </body>
    </html>
  );
}
