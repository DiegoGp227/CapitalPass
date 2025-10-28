import "../styles/global.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// import Header from "./components/organisms/Header";
import { SWRProvider } from "../provider/swrProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Taskly",
  description: "Taskly app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-hard-gray min-h-screen flex flex-col`}
      >
        <SWRProvider>
          {/* <Header /> */}
          <div className="max-w-screen-2xl mx-auto flex-1 w-full">
            {children}
          </div>
        </SWRProvider>
      </body>
    </html>
  );
}
