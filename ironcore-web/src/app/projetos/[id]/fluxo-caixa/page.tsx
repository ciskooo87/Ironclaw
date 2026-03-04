import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Fluxo de Caixa" bullets={[
    "Projeção de 90 dias com premissas por projeto",
    "Cenário base + impactos de operações financeiras",
    "Sinalização de ruptura e dias até ruptura",
    "Explicabilidade da IA sobre cada recomendação",
  ]} />;
}
