import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · DRE / DFC" bullets={[
    "Layout profissional parametrizável por projeto",
    "Fechamento com trilha de auditoria e versionamento",
    "Cruzamento com fluxo projetado e riscos ativos",
    "Base para geração automática de material executivo",
  ]} />;
}
