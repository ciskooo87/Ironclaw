import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function AdminPage() {
  const user = await requireUser();
  return <ModulePage user={user} title="Admin Master" bullets={[
    "Gestão de usuários e perfis",
    "Permissões por projeto",
    "Configuração global de deploy e integrações",
    "Governança de snapshots, auditoria e políticas",
  ]} />;
}
