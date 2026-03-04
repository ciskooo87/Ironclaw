import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Rotina Diária" bullets={[
    "Botão de execução síncrona (espera conclusão)",
    "Pipeline: movimento do dia + IA + análise de fluxo",
    "Saída preparada para envio automático",
    "Processamento no fuso Brasil",
  ]} />;
}
