import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Cadastro" bullets={[
    "Dados obrigatórios: CNPJ, razão social, sócios, segmento",
    "Múltiplas contas bancárias e múltiplos fundos por projeto",
    "Configuração de variáveis de fluxo de caixa (em fase de detalhamento)",
    "Regras de bloqueio e alertas críticos por projeto",
  ]} />;
}
