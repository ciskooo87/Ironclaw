import Link from "next/link";
import { APP_ROUTES } from "@/lib/navigation";
import type { SessionUser } from "@/lib/auth";

export function AppShell({ title, subtitle, user, children }: { title: string; subtitle?: string; user: SessionUser; children: React.ReactNode }) {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <header className="card mb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="text-sm text-slate-400 mt-1">{subtitle}</p> : null}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <span className="pill">{user.name}</span>
            <span className="pill">{user.role}</span>
            <form action="/api/auth/logout" method="post">
              <button className="pill" type="submit">Sair</button>
            </form>
          </div>
        </div>
      </header>

      <nav className="card mb-4 overflow-auto">
        <div className="flex gap-2 min-w-max">
          {APP_ROUTES.map((r) => (
            <Link key={r.href} href={r.href} className="pill whitespace-nowrap">
              {r.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </main>
  );
}
