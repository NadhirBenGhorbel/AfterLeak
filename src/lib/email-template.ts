export type AlertEmailPayload = {
  to: string;
  subject: string;
  userName: string;
  recipientEmail: string;
  score: number;
  breachCount: number;
  exposedCategories: string[];
  breaches: Array<{
    company: string;
    severity: string;
    details: string;
  }>;
  isSafe?: boolean;
};

export function renderAlertEmailHtml(payload: AlertEmailPayload) {
  const isSafe = Boolean(payload.isSafe);
  const breachRows = payload.breaches
    .map((breach) => `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #2d3748;">
          <div style="font-size: 14px; font-weight: 600; color: #f8fafc;">${breach.company}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">${breach.details}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #2d3748; text-align: right;">
          <span style="display: inline-block; padding: 4px 8px; border-radius: 9999px; background: ${breach.severity === "critique" ? "#7f1d1d" : breach.severity === "élevé" ? "#7c2d12" : "#1d4ed8"}; color: white; font-size: 12px; font-weight: 700;">${breach.severity}</span>
        </td>
      </tr>
    `)
    .join("");

  const categories = payload.exposedCategories.length
    ? payload.exposedCategories.map((category) => `<li style="margin: 6px 0; color: #e2e8f0;">${category}</li>`).join("")
    : "<li style=\"margin: 6px 0; color: #e2e8f0;\">Aucune catégorie critique détectée</li>";

  return `
    <div style="font-family: Inter, Arial, sans-serif; background: #020617; color: #f8fafc; padding: 24px;">
      <div style="max-width: 680px; margin: 0 auto; background: linear-gradient(135deg, #0f172a 0%, #111827 100%); border: 1px solid #334155; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.3);">
        <div style="padding: 28px 32px; border-bottom: 1px solid #1e293b; background: linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%);">
          <div style="font-size: 12px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.8);">AfterLeak</div>
          <h1 style="margin: 8px 0 0; font-size: 28px; line-height: 1.2;">${isSafe ? "Récapitulatif de sécurité" : "Récapitulatif de vos potentielles fuites"}</h1>
        </div>

        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 14px; color: #cbd5e1; font-size: 15px;">Bonjour ${payload.userName},</p>
          <p style="margin: 0 0 18px; color: #e2e8f0; font-size: 15px;">
            ${isSafe ? "Aucune empreinte de fuite connue n’a été détectée pour votre profil. Votre posture de sécurité apparaît actuellement saine." : "Nous avons préparé un résumé de votre exposition potentielle avec les derniers éléments détectés sur votre profil."}
          </p>

          <div style="display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin: 24px 0;">
            <div style="padding: 14px; background: rgba(37,99,235,0.14); border: 1px solid rgba(96,165,250,0.32); border-radius: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #93c5fd;">Score global</div>
              <div style="font-size: 24px; font-weight: 700; color: #f8fafc; margin-top: 6px;">${payload.score}/100</div>
            </div>
            <div style="padding: 14px; background: rgba(139,92,246,0.14); border: 1px solid rgba(196,181,253,0.32); border-radius: 16px;">
              <div style="font-size: 12px; text-transform: uppercase; color: #c4b5fd;">Fuites détectées</div>
              <div style="font-size: 24px; font-weight: 700; color: #f8fafc; margin-top: 6px;">${payload.breachCount}</div>
            </div>
          </div>

          <div style="margin-top: 24px; padding: 18px; border-radius: 16px; background: rgba(15,23,42,0.85); border: 1px solid #334155;">
            <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 10px;">Catégories exposées</div>
            <ul style="margin: 0; padding-left: 18px;">${categories}</ul>
          </div>

          <div style="margin-top: 24px;">
            <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 10px;">Sources principales</div>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>${breachRows}</tbody>
            </table>
          </div>

          <div style="margin-top: 24px; padding: 16px 18px; border-radius: 16px; background: rgba(20,184,166,0.12); border: 1px solid rgba(45,212,191,0.2); color: #ccfbf1;">
            ${isSafe ? "Recommandation prioritaire : continuez à surveiller vos accès et gardez vos habitudes de sécurité à jour." : "Recommandation prioritaire : changez rapidement les mots de passe des comptes exposés et activez la surveillance continue."}
          </div>

          <div style="margin-top: 24px; text-align: center;">
            <a href="https://afterleak.local/login" style="display: inline-block; padding: 12px 18px; background: linear-gradient(90deg, #2563eb 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 999px; font-weight: 700;">Voir mon tableau de bord</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderAlertEmailText(payload: AlertEmailPayload) {
  const isSafe = Boolean(payload.isSafe);
  return [
    `Bonjour ${payload.userName},`,
    "",
    isSafe ? "Voici votre récapitulatif AfterLeak : aucune exposition vérifiée n’a été détectée pour votre profil." : "Voici votre récapitulatif AfterLeak :",
    `Score d'exposition : ${payload.score}/100`,
    `Fuites détectées : ${payload.breachCount}`,
    `Catégories exposées : ${payload.exposedCategories.join(", ") || "Aucune catégorie critique détectée"}`,
    "Sources principales :",
    ...payload.breaches.map((breach) => `- ${breach.company} (${breach.severity}) : ${breach.details}`),
    "",
    isSafe ? "Recommandation prioritaire : continuez à surveiller vos accès et gardez vos habitudes de sécurité à jour." : "Recommandation prioritaire : changez rapidement les mots de passe des comptes exposés et activez la surveillance continue.",
    "",
    "Voir mon tableau de bord : https://afterleak.local/login",
  ].join("\n");
}
