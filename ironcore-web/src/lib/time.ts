export function todayInSaoPauloISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export function diffDaysFromSaoPaulo(dateISO: string) {
  const today = todayInSaoPauloISO();
  const d1 = new Date(`${today}T00:00:00-03:00`).getTime();
  const d2 = new Date(`${dateISO}T00:00:00-03:00`).getTime();
  return Math.floor((d1 - d2) / 86400000);
}
