import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Travel App",
  description: "A travel planning application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
