import * as XLSX from "xlsx";

type ParsedUpload = {
  faturamento: number;
  contas_receber: number;
  contas_pagar: number;
  extrato_bancario: number;
  duplicatas: number;
  lines: number;
};

const MAP: Record<string, keyof ParsedUpload | null> = {
  faturamento: "faturamento",
  contas_receber: "contas_receber",
  contas_pagar: "contas_pagar",
  extrato_bancario: "extrato_bancario",
  duplicatas: "duplicatas",
};

function toNum(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fromRows(rows: Array<Record<string, unknown>>): ParsedUpload {
  const acc: ParsedUpload = {
    faturamento: 0,
    contas_receber: 0,
    contas_pagar: 0,
    extrato_bancario: 0,
    duplicatas: 0,
    lines: rows.length,
  };

  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      const key = MAP[k.trim().toLowerCase()] || null;
      if (key) acc[key] += toNum(v);
    }
  }
  return acc;
}

export async function parseUploadedFile(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const txt = buf.toString("utf-8");
    const [head, ...lines] = txt.split(/\r?\n/).filter(Boolean);
    const cols = head.split(",").map((s) => s.trim());
    const rows = lines.map((line) => {
      const parts = line.split(",");
      const row: Record<string, unknown> = {};
      cols.forEach((c, i) => {
        row[c] = parts[i] ?? "";
      });
      return row;
    });
    return fromRows(rows);
  }

  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  return fromRows(rows);
}
