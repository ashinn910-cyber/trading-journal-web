import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Trading Journal",
  description: "Trading Journal — Professional V1.1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
