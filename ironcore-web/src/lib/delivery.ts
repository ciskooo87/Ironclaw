export type DeliveryPayload = {
  projectCode: string;
  businessDate: string;
  status: "success" | "warning" | "blocked";
  summaryText: string;
  channels: Array<"telegram" | "whatsapp" | "email">;
};

export function buildDeliveryPayload(input: {
  projectCode: string;
  businessDate: string;
  status: "success" | "warning" | "blocked";
  reconciliationPending: number;
  riskLevel: string;
}) {
  const summaryText = [
    `Projeto: ${input.projectCode}`,
    `Data: ${input.businessDate}`,
    `Status: ${input.status}`,
    `Pendências conciliação: ${input.reconciliationPending}`,
    `Risco IA: ${input.riskLevel}`,
  ].join(" | ");

  return {
    projectCode: input.projectCode,
    businessDate: input.businessDate,
    status: input.status,
    summaryText,
    channels: ["telegram", "whatsapp", "email"],
  } satisfies DeliveryPayload;
}
