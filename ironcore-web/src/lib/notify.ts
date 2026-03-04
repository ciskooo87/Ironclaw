import nodemailer from "nodemailer";

export type DispatchResult = { channel: "telegram" | "whatsapp" | "email"; status: "sent" | "failed" | "skipped"; target?: string; message: string };

async function sendTelegram(text: string): Promise<DispatchResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { channel: "telegram", status: "skipped", message: "TELEGRAM env ausente" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    const data = await res.json();
    return res.ok
      ? { channel: "telegram", status: "sent", target: chatId, message: String(data?.result?.message_id || "ok") }
      : { channel: "telegram", status: "failed", target: chatId, message: JSON.stringify(data) };
  } catch (e) {
    return { channel: "telegram", status: "failed", target: chatId, message: String(e) };
  }
}

async function sendWebhook(channel: "whatsapp", text: string): Promise<DispatchResult> {
  const url = process.env.WHATSAPP_WEBHOOK_URL;
  if (!url) return { channel, status: "skipped", message: "WHATSAPP_WEBHOOK_URL ausente" };
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, channel }) });
    return res.ok ? { channel, status: "sent", message: "ok" } : { channel, status: "failed", message: await res.text() };
  } catch (e) {
    return { channel, status: "failed", message: String(e) };
  }
}

async function sendEmail(text: string): Promise<DispatchResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const to = process.env.SMTP_TO;
  const from = process.env.SMTP_FROM || user;
  if (!host || !user || !pass || !to || !from) return { channel: "email", status: "skipped", message: "SMTP env ausente" };

  try {
    const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    const info = await transport.sendMail({ from, to, subject: "IronCore · Rotina diária", text });
    return { channel: "email", status: "sent", target: to, message: info.messageId };
  } catch (e) {
    return { channel: "email", status: "failed", target: to, message: String(e) };
  }
}

export async function dispatchRoutineSummary(text: string) {
  const [t, w, e] = await Promise.all([sendTelegram(text), sendWebhook("whatsapp", text), sendEmail(text)]);
  return [t, w, e];
}
