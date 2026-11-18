import Link from "next/link";
import { Bell, ShieldCheck } from "lucide-react";
import type { User } from "@/lib/auth";
import { unreadCount } from "@/lib/notify";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/bits";
import { LinkButton } from "@/components/ui/Button";
import { TopNav } from "./NavLinks";
export async function Header({ user }: {
    user: User | null;
}) {
    const staff = user?.role === "municipio" || user?.role === "moderador";
    const unread = user ? await unreadCount(user.id) : 0;
    return (<header className="sticky top-0 z-50 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="Sampacho Conecta, ir al inicio" className="site-brand min-w-0">
          <Logo size={34}/>
        </Link>
        <TopNav />
        <div className="flex items-center gap-2">
          {staff && (<Link href="/panel" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 font-bold text-monte hover:bg-monte-soft sm:inline-flex">
              <ShieldCheck className="size-5" aria-hidden/>
              Panel
            </Link>)}
          {user && (<Link href="/notificaciones" className="relative grid size-11 place-items-center rounded-full transition hover:bg-surface-2" aria-label={unread ? `Avisos para mí, ${unread} sin leer` : "Avisos para mí"}>
              <Bell className="size-6" aria-hidden/>
              {unread > 0 && <span aria-hidden className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-err px-1 text-xs font-bold leading-5 text-white">{unread > 9 ? "9+" : unread}</span>}
            </Link>)}
          {user ? (<Link href="/perfil" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition hover:bg-surface-2" aria-label={`Mi perfil, ${user.name}`}>
              <Avatar name={user.name} size={36}/>
              <span className="hidden max-w-28 truncate font-bold sm:inline">{user.name.split(" ")[0]}</span>
            </Link>) : (<>
              <LinkButton href="/ingresar" variant="secondary" size="sm">
                Ingresar
              </LinkButton>
              <span className="hidden sm:inline-flex">
                <LinkButton href="/registro" size="sm">Registrarme</LinkButton>
              </span>
            </>)}
        </div>
      </div>
    </header>);
}
