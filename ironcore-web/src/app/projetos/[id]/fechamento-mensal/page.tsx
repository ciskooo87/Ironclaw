import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Fechamento Mensal" bullets={[
    "Snapshot mensal imutável com versionamento",
    "Reabertura controlada com justificativa e auditoria",
    "Consolidação DRE/DFC por projeto",
    "Checklist de fechamento e bloqueios de compliance",
  ]} />;
}
