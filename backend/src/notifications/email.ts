import nodemailer from "nodemailer";
import { getEnv } from "../config/env";

const env = getEnv();

function isEmailConfigured() {
  return (
    !!env.SMTP_HOST &&
    !!env.SMTP_PORT &&
    !!env.SMTP_USER &&
    !!env.SMTP_PASS &&
    !!env.EMAIL_FROM &&
    !!env.EMAIL_TO
  );
}

export async function sendMeetingEmail(input: {
  subject: string;
  when?: string | null;
  summary?: string | null;
  actionItems?: Array<{ description: string; owner?: string | null; deadline?: string | null }>;
  topics?: string[];
}): Promise<void> {
  if (!isEmailConfigured()) return;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT!,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    }
  });

  const actionItemsHtml = (input.actionItems ?? [])
    .map((a) => {
      const owner = a.owner ? ` — <b>${a.owner}</b>` : "";
      const dl = a.deadline ? ` (prazo: ${a.deadline})` : "";
      return `<li>${a.description}${owner}${dl}</li>`;
    })
    .join("");

  const topicsHtml = (input.topics ?? []).map((t) => `<li>${t}</li>`).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4">
      <h2 style="margin: 0 0 8px">${input.subject}</h2>
      ${input.when ? `<div style="color:#666;margin-bottom:12px">${input.when}</div>` : ""}
      ${
        input.summary
          ? `<h3>Resumo</h3><pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(
              input.summary
            )}</pre>`
          : ""
      }
      ${actionItemsHtml ? `<h3>Action items</h3><ul>${actionItemsHtml}</ul>` : ""}
      ${topicsHtml ? `<h3>Tópicos</h3><ul>${topicsHtml}</ul>` : ""}
    </div>
  `;

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: env.EMAIL_TO,
    subject: `Relatório da reunião: ${input.subject}`,
    html
  });
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

