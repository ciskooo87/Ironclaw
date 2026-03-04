import { ModulePage } from "@/components/ModulePage";
import { requireUser } from "@/lib/guards";

export default async function Page() {
  const user = await requireUser();
  return <ModulePage user={user} title="Projeto · Operações" bullets={[
    "Operações reais com impacto imediato no caixa projetado",
    "Tipos V1: desconto de duplicatas, comissária, fomento e intercompany",
    "Sugestão de títulos para desconto considerando limite de fundo e recebível disponível",
    "Rastreabilidade por operação e aprovação por perfil",
  ]} />;
}
