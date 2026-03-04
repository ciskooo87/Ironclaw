"use client";

import { useMemo, useState } from "react";

type Sheet = {
  name: string;
  rowCount: number;
  colCount: number;
  rows: string[][];
};

type Workbook = {
  generatedFrom: string;
  visibleSheets: Sheet[];
};

const PAGE_SIZE = 40;

function normalize(v: string) {
  return (v || "").toString().toLowerCase();
}

export function DreWorkbookApp({ workbook }: { workbook: Workbook }) {
  const [sheetIndex, setSheetIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const sheet = workbook.visibleSheets[sheetIndex];
  const header = sheet?.rows?.[0] ?? [];
  const bodyRows = sheet?.rows?.slice(1) ?? [];

  const filteredRows = useMemo(() => {
    if (!query.trim()) return bodyRows;
    const q = normalize(query);
    return bodyRows.filter((r) => r.some((c) => normalize(c).includes(q)));
  }, [bodyRows, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  function onSheetChange(i: number) {
    setSheetIndex(i);
    setPage(1);
    setQuery("");
  }

  return (
    <section className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap gap-2">
          {workbook.visibleSheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => onSheetChange(i)}
              className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${
                i === sheetIndex
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/30"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="title">{sheet?.name}</h2>
          <div className="text-xs text-slate-400">
            {filteredRows.length.toLocaleString("pt-BR")} linhas · {sheet?.colCount ?? 0} colunas
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar texto na aba atual..."
            className="w-full md:w-96 bg-slate-950/40 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              className="pill disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ◀
            </button>
            <span className="text-xs text-slate-400">Página {safePage} / {totalPages}</span>
            <button
              className="pill disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ▶
            </button>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-900/80 sticky top-0 z-10">
              <tr>
                {header.map((h, i) => (
                  <th key={i} className="text-left font-medium px-3 py-2 border-b border-slate-800 whitespace-nowrap">
                    {h || `Coluna ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, ri) => (
                <tr key={ri} className="odd:bg-slate-900/30">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 border-b border-slate-900 align-top whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
