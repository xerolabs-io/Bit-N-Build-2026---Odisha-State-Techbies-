import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Outfit, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Header from "@/components/Header";
import UserSync from "@/components/UserSync";
import EmergencySosModal from "@/components/emergency/EmergencySosModal";
import { Toaster } from "@/components/ui/toast";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Tinggle | Civic Trust & Verification Layer for Emergency Dispatch",
    template: "%s | Tinggle",
  },
  description:
    "Real-time civic intelligence and incident verification platform connecting citizens, eyewitnesses, and municipal emergency dispatchers through verified telemetry and mathematical credibility scoring.",
  applicationName: "Tinggle",
  authors: [{ name: "Techbies" }],
  generator: "Next.js",
  keywords: [
    "Tinggle",
    "incident reporting",
    "emergency dispatch",
    "civic safety",
    "trust verification layer",
    "signal vs noise",
    "credibility scoring",
    "eyewitness verification",
    "telemetry shield",
    "Techbies",
    "municipal dispatch",
  ],
  creator: "Techbies",
  publisher: "Techbies",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tinggle | Civic Trust & Verification Layer for Emergency Dispatch",
    description:
      "Filtering rumors from real emergencies. High-confidence civic incident verification and rapid emergency response dispatch.",
    url: "/",
    siteName: "Tinggle",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.svg",
        width: 390,
        height: 117,
        alt: "Tinggle Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tinggle | Civic Trust & Verification Layer for Emergency Dispatch",
    description:
      "Citizen incident reporting platform with mathematical credibility verification for emergency dispatch.",
    creator: "@techbies",
    images: ["/logo.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${spaceGrotesk.variable} ${outfit.className} h-full`}
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-[#0d131e] text-zinc-100">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <UserSync />
          <Header />
          <main className="min-h-screen flex-1">{children}</main>
          <EmergencySosModal />
          <Toaster richColors />
          <footer className="px-4 py-8 border-t border-white/10" style={{ background: "linear-gradient(135deg, #000000 0%, #111111 30%, #1a1a1a 60%, #0d131e 100%)" }}>
            <div className="max-w-6xl mx-auto flex justify-center items-center">
              <p className="text-zinc-500 text-sm tracking-wide">Made with ❤️ By <span className="text-zinc-300 font-semibold">Techbies</span></p>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}