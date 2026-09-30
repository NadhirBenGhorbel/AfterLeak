import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFileRoute } from "@tanstack/react-router";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { renderAlertEmailHtml, renderAlertEmailText, type AlertEmailPayload } from "@/lib/email-template";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

export const Route = createFileRoute("/api/send-alert-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        dotenv.config();

        const payload = (await request.json()) as AlertEmailPayload;
        const gmailUser = process.env.GMAIL_USER?.trim();
        const gmailPass = process.env.GMAIL_PASS?.trim() ?? process.env.GMAIL_APP_PASSWORD?.trim() ?? process.env.GMAIL_APP_PASS?.trim();
        const fromName = process.env.GMAIL_FROM_NAME?.trim() ?? "AfterLeak";

        if (!gmailUser || !gmailPass) {
          return new Response(
            JSON.stringify({ ok: false, error: "Gmail credentials are not configured in the project .env file" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          requireTLS: true,
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        try {
          const info = await transporter.sendMail({
            from: `${fromName} <${gmailUser}>`,
            to: payload.to,
            subject: payload.subject,
            text: renderAlertEmailText(payload),
            html: renderAlertEmailHtml(payload),
          });

          return new Response(
            JSON.stringify({ ok: true, mode: "live", messageId: info.messageId, to: payload.to }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown SMTP error";
          const friendlyMessage = message.includes("Invalid login")
            ? "Gmail rejected the login. For Gmail, use an App Password (not the normal account password) after enabling 2-Step Verification."
            : message;

          return new Response(
            JSON.stringify({ ok: false, error: friendlyMessage }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
