import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/guards";

const MODULES = [
  {
    title: "1) Cadastro",
    objective: "Base de dados mestre para clientes, fornecedores, cedentes, regras financeiras e plano de contas.",
    done: [
      "Validação de campos críticos e duplicidade",
      "Versionamento por vigência (sem reescrever histórico)",
      "Soft delete com trilha de auditoria",
    ],
  },
  {
    title: "2) Risco e Alertas",
    objective: "Motor de regras com severidade, owner e SLA automático.",
    done: [
      "Escalonamento por criticidade",
      "Deduplicação/correlação de alertas",
      "Tratativa com evidência e status auditável",
    ],
  },
  {
    title: "3) Conciliação",
    objective: "Matching 1:1, 1:N e N:1 entre eventos internos e extratos externos.",
    done: [
      "Ordem de match por identificador -> valor/data -> similaridade",
      "Tolerância parametrizável por tipo de operação",
      "Fila de exceções com owner, prazo e causa-raiz",
    ],
  },
  {
    title: "4) Operações",
    objective: "Máquina de estados ponta a ponta da operação.",
    done: [
      "Fluxo: novo -> validado -> aprovado -> liquidado -> conciliado -> fechado",
      "Sem pulo de etapa sem override auditado",
      "Bloqueio automático com alerta crítico aberto",
    ],
  },
  {
    title: "5) Fluxo de Caixa",
    objective: "Projeção D+90 com cenários base, conservador e estresse.",
    done: [
      "Separação explícita entre previsto e realizado",
      "Forecast rolling com recálculo por evento",
      "Alertas de liquidez e descasamento",
    ],
  },
  {
    title: "6) DRE e DFC",
    objective: "Competência (DRE) e caixa (DFC) reconciliados por bridge.",
    done: [
      "Mapeamento contábil versionado",
      "Fechamento com controle de versão",
      "Bridge DRE x DFC explicando diferenças",
    ],
  },
  {
    title: "7) Rotina",
    objective: "Orquestração diária de jobs com dependências e retries controlados.",
    done: [
      "Dependência obrigatória antes de job crítico",
      "Retry com limite + incidente após falha final",
      "Reprocesso seletivo e idempotente",
    ],
  },
  {
    title: "8) Painel Diário",
    objective: "Tela de guerra do dia com semáforo, pendências e donos.",
    done: [
      "Conciliação, risco, SLA e caixa em uma visão",
      "Top pendências acionáveis com prazo",
      "Resumo pronto para check-ins 09/13/18/22",
    ],
  },
  {
    title: "9) Dashboard",
    objective: "Camada tática/estratégica por tendência, margem e eficiência.",
    done: [
      "Comparativos WoW/MoM por projeto",
      "Dicionário de KPI com fórmula e fonte",
      "Ranking de performance e ofensores",
    ],
  },
  {
    title: "10) Fechamento",
    objective: "Checklist formal, travas e publicação da versão oficial.",
    done: [
      "Itens obrigatórios com evidência",
      "Ajustes manuais com aprovação",
      "Reabertura apenas formal com nova versão",
    ],
  },
  {
    title: "11) Auditoria",
    objective: "Rastreabilidade imutável de ações, evidências e não conformidades.",
    done: [
      "Log append-only para eventos sensíveis",
      "Checksum de evidências",
      "Plano de ação para achados",
    ],
  },
  {
    title: "12) Projetos",
    objective: "Gestão multi-projeto com segregação e comparabilidade.",
    done: [
      "Isolamento por project_id",
      "Onboarding padronizado",
      "Health score por projeto",
    ],
  },
  {
    title: "13) Admin / Status OP / Delivery",
    objective: "Governança operacional, capacidade e entregas em uma torre de controle.",
    done: [
      "Gestão de acessos e integrações",
      "Status operacional em tempo real",
      "Delivery com critério de aceite e evidência",
    ],
  },
] as const;

export default async function ProcessoPage() {
  const user = await requireUser();

  return (
    <AppShell
      user={user}
      title="Blueprint de Processo · 13 Abas"
      subtitle="Revisão consolidada de hoje: objetivo, controles e definição de pronto por módulo"
    >
      <section className="card mb-4">
        <h2 className="title">Plano de implementação (ordem sugerida)</h2>
        <p className="mt-2 text-sm text-slate-300">
          Cadastro → Risco e Alertas → Conciliação → Operações → Fluxo de Caixa → DRE/DFC → Rotina →
          Painel Diário → Dashboard → Fechamento → Auditoria → Projetos → Admin/Status OP/Delivery.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {MODULES.map((module) => (
          <article key={module.title} className="card">
            <h3 className="font-semibold text-base">{module.title}</h3>
            <p className="text-sm text-slate-300 mt-1">{module.objective}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {module.done.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
