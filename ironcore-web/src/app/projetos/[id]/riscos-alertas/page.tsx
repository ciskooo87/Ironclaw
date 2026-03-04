import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Riscos e Alertas" bullets={[
    "Cadastro de riscos por projeto (peso, gatilho e criticidade)",
    "Alertas críticos configuráveis por projeto",
    "Bloqueios de avanço de fluxo baseados em alerta",
    "Trilha de alterações e aprovação por perfil",
  ]} />;
}
