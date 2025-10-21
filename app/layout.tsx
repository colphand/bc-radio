import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomPlayer } from "@/components/bottom-player";
import { AlbumProvider } from "@/contexts/AlbumContext";
import "./globals.css";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BC Radio - Bandcamp Collection Player",
  description: "Play your Bandcamp collection as a radio station",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased pb-24`}
      >
        <SidebarProvider>
          <AlbumProvider>
            <AppSidebar />
            <SidebarInset>

              {children}
              <BottomPlayer />
            </SidebarInset>
          </AlbumProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
