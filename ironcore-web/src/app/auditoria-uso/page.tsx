import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function AuditoriaUsoPage() {
  const user = await requireUser();
  return <ModulePage user={user} title="Auditoria de Uso" bullets={[
    "Usuários ativos por período e projeto",
    "Projetos ativos e taxa de execução da rotina",
    "Tempo por módulo e funil operacional",
    "Inconsistências por projeto e tendência",
    "Acesso: Head, Diretoria e Admin Master",
  ]} />;
}
