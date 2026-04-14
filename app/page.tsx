import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";

export default async function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-2 items-center font-black text-2xl tracking-tighter">
              <Link href={"/"}>Solfy<span className="text-primary">.</span></Link>
            </div>
            <div className="flex gap-4 items-center">
              {hasEnvVars && (
                <Suspense>
                  <AuthButton />
                </Suspense>
              )}
              <ThemeSwitcher />
            </div>
          </div>
        </nav>

        <div className="flex-1 flex flex-col gap-8 max-w-5xl p-5 items-center justify-center text-center -mt-20">
          <div className="flex flex-col gap-6 items-center">
            <h1 className="text-5xl lg:text-8xl font-black max-w-4xl leading-[1.1] tracking-tighter animate-in fade-in slide-in-from-bottom-6 duration-1000">
              Bienvenido al <br />
              <span className="text-primary bg-clip-text">Portal Solfy</span>
            </h1>
            <p className="text-xl lg:text-2xl text-muted-foreground max-w-2xl font-medium leading-relaxed">
              La plataforma inteligente para gestionar tus proyectos y tickets de asistencia con total transparencia.
            </p>
            <div className="flex gap-4 mt-8">
              <Link
                href="/protected"
                className="bg-primary text-primary-foreground px-10 py-4 rounded-full font-black text-lg hover:opacity-90 transition-all hover:scale-105 shadow-xl shadow-primary/25"
              >
                Acceder al Portal
              </Link>
            </div>
          </div>
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            &copy; {new Date().getFullYear()} Solfy. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </main>
  );
}
