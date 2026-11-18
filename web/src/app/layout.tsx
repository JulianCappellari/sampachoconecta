import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/auth";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BottomNav } from "@/components/site/NavLinks";
import { RevealProvider } from "@/components/motion/RevealProvider";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { RegisterSW } from "@/components/site/RegisterSW";
import { EmergencyButton } from "@/components/site/EmergencyButton";
import { INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const maxDuration = 60;

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} · ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["Sampacho", "Sampacho Córdoba", "comercios de Sampacho", "oficios Sampacho", "farmacia de turno Sampacho", "noticias de Sampacho", "reclamos municipalidad de Sampacho", "residuos Sampacho", "teléfonos útiles Sampacho"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  openGraph: { type: "website", locale: "es_AR", siteName: SITE_NAME, title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} · ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
  // Solo el sitio real (SITE_INDEXING=on) se ofrece a Google. El de ejemplo y las previews quedan fuera.
  robots: INDEXABLE
    ? { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } }
    : { index: false, follow: false },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1513" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="es-AR" className={`${display.variable} ${body.variable}`} style={user?.big_text ? { fontSize: "120%" } : undefined}>
      <body className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <a
          href="#contenido"
          className="sr-only z-[60] rounded-lg bg-ink px-4 py-2 font-bold text-bg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Saltar al contenido
        </a>
        <Header user={user} />
        <main id="contenido">{children}</main>
        <Footer />
        <BottomNav />
        <EmergencyButton />
        <RegisterSW userId={user?.id ?? null} />
        <RevealProvider />
        <SmoothScroll />
      </body>
    </html>
  );
}
