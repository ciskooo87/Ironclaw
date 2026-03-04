import { AppShell } from "@/components/AppShell";
import type { SessionUser } from "@/lib/auth";

export function ModulePage({ user, title, bullets }: { user: SessionUser; title: string; bullets: string[] }) {
  return (
    <AppShell user={user} title={title} subtitle="Sprint 1 · Estrutura profissional multipáginas do fluxo IronCore">
      <section className="card">
        <h2 className="title">Escopo implementado nesta página</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {bullets.map((b) => (
            <li key={b} className="row !justify-start">• {b}</li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
