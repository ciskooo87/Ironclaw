export function num(v: FormDataEntryValue | null, min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) throw new Error("invalid_number");
  if (n < min || n > max) throw new Error("out_of_range");
  return n;
}

export function str(v: FormDataEntryValue | null, min = 0, max = 2000) {
  const s = String(v ?? "").trim();
  if (s.length < min) throw new Error("too_short");
  if (s.length > max) throw new Error("too_long");
  return s;
}

export function ym(v: FormDataEntryValue | null) {
  const s = str(v, 7, 7);
  if (!/^\d{4}-\d{2}$/.test(s)) throw new Error("invalid_period");
  return s;
}
