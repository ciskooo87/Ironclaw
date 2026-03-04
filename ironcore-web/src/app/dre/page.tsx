import data from "@/data/dreWorkbook.json";
import { DreWorkbookApp } from "./DreWorkbookApp";

export const dynamic = "force-static";

export default function DrePage() {
  return (
    <main className="min-h-screen p-6 md:p-8">
      <header className="card mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">IronCore · DRE Online</h1>
            <p className="text-sm text-slate-400 mt-1">
              Versão app da planilha (somente abas visíveis).
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="pill">Fonte: {data.generatedFrom}</span>
            <span className="pill">Abas visíveis: {data.visibleSheets.length}</span>
          </div>
        </div>
      </header>

      <DreWorkbookApp workbook={data} />
    </main>
  );
}
