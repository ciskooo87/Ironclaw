export function integrationHealth() {
  return {
    telegram: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    whatsapp: !!process.env.WHATSAPP_WEBHOOK_URL,
    email: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_TO),
  };
}
