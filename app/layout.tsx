import type { Metadata } from "next";
import { Navbar } from "./components/nav";
import Footer from "./components/footer";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeChecker } from "./components/ThemeChecker";
import "leaflet/dist/leaflet.css";
import SmoothScroll from "./components/SmoothScroll";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body>
        <SmoothScroll />
        <ThemeChecker>
          <div className="sticky top-0 z-50 backdrop-blur-xl bg-background/60s">
            <Navbar />
          </div>

          <main className="px-4 sm:px-8 lg:px-28">{children}</main>
          {/* px-4 sm:px-8 lg:px-28 */}
          <div className="px-4 sm:px-8 lg:px-28">
            <Footer />
          </div>
        </ThemeChecker>
      </body>
    </html>
  );
}
