import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Painel Diário" bullets={[
    "Entrada manual e upload (xlsx/csv)",
    "Entidades: faturamento, contas a receber, contas a pagar, extrato e duplicatas",
    "Edição retroativa até 5 dias",
    "Auditoria completa: quem alterou, quando e antes/depois",
  ]} />;
}
