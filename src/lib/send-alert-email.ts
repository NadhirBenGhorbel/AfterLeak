import { renderAlertEmailHtml, renderAlertEmailText, type AlertEmailPayload } from "./email-template";

export async function sendAlertEmail(payload: AlertEmailPayload) {
  try {
    const response = await fetch("/api/send-alert-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.text();

    if (!response.ok) {
      let message = "Impossible d'envoyer l'email.";
      try {
        const parsed = JSON.parse(body);
        message = parsed?.error ?? parsed?.message ?? message;
      } catch {
        message = body || message;
      }
      throw new Error(message);
    }

    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  } catch (error) {
    console.error("Failed to send alert email", error);
    throw error;
  }
}

export { renderAlertEmailHtml, renderAlertEmailText };
