import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  const col = "grid content-start gap-1.5";
  const a = "w-fit py-0.5 text-ink-2 hover:text-monte hover:underline";
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="grid content-start gap-3">
          <Logo />
          <p className="max-w-xs text-ink-2">Pensado por y para los vecinos de Sampacho: informados, conectados y con voz.</p>
        </div>
        <nav aria-label="Pueblo" className={col}>
          <h2 className="mb-1 text-base font-bold">El pueblo</h2>
          <Link className={a} href="/muro">Muro</Link>
          <Link className={a} href="/agenda">Agenda</Link>
          <Link className={a} href="/ideas">Ideas vecinales</Link>
          <Link className={a} href="/encuestas">Encuestas</Link>
          <Link className={a} href="/residuos">Residuos</Link>
          <Link className={a} href="/transparencia">Transparencia</Link>
          <Link className={a} href="/utiles">Teléfonos útiles</Link>
        </nav>
        <nav aria-label="Servicios" className={col}>
          <h2 className="mb-1 text-base font-bold">Servicios</h2>
          <Link className={a} href="/guia">Guía de comercios</Link>
          <Link className={a} href="/oficios">Oficios</Link>
          <Link className={a} href="/empleo">Bolsa de trabajo</Link>
          <Link className={a} href="/visitar">Visitar Sampacho</Link>
          <Link className={a} href="/reclamos/nuevo">Hacer un reclamo</Link>
        </nav>
        <nav aria-label="Cuenta" className={col}>
          <h2 className="mb-1 text-base font-bold">Tu cuenta</h2>
          <Link className={a} href="/ingresar">Ingresar</Link>
          <Link className={a} href="/registro">Crear cuenta</Link>
          <Link className={a} href="/privacidad">Privacidad y datos</Link>
        </nav>
      </div>
      <div className="border-t border-line py-5 text-center text-sm text-ink-2">
        © {new Date().getFullYear()} Sampacho Conecta · Proyecto comunitario
      </div>
    </footer>
  );
}
