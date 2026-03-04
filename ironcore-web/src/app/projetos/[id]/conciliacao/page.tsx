import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Conciliação" bullets={[
    "Conciliação sem tolerância (match exato)",
    "Pendências entram como risco bloqueador quando configurado",
    "Quando faltar dado D-1, rotina utiliza fluxo de caixa projetado",
    "Registro de tentativas e correções para auditoria",
  ]} />;
}
