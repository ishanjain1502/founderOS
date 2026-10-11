import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEO Decision Sandbox",
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
