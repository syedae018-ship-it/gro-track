export async function sendGoogleChatWebhook(message: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("GOOGLE_CHAT_WEBHOOK_URL not configured. Skipping chat notification.");
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ text: message })
    });
    if (!res.ok) {
      console.error("Failed to send Google Chat webhook", await res.text());
    }
  } catch (error) {
    console.error("Error sending Google Chat webhook:", error);
  }
}

export async function sendGmail(to: string, subject: string, text: string, html?: string, attachments?: any[]) {
  // In a real environment, you'd use nodemailer configured with a Google Workspace SMTP relay or Gmail API
  // e.g. using nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS } })
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    console.warn("GMAIL credentials not configured. Skipping email send.");
    return;
  }

  try {
    // Dynamic import to avoid blowing up edge runtimes if not compatible
    const nodemailer = (await import('nodemailer')).default;
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });

    await transporter.sendMail({
      from: `"GroTrack" <${user}>`,
      to,
      subject,
      text,
      html: html || text,
      attachments
    });
    console.log(`Successfully sent email to ${to}`);
  } catch (error) {
    console.error("Error sending Gmail:", error);
  }
}
