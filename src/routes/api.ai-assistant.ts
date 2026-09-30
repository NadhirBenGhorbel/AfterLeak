import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createFileRoute } from "@tanstack/react-router";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(projectRoot, ".env") });

type AssistantAdvice = {
  conclusion: string;
  passwordAdvice: string;
  strengthTips: string[];
  crackTimeEstimate: string;
  timeline: Array<{ title: string; summary: string }>;
  newPassword?: string;
  passwordStrength?: string;
  passwordPolicyNote?: string;
  nextSteps?: string[];
  siteRecommendation?: string;
  threatIntelSummary?: string;
  threatFlags?: string[];
  threatActions?: string[];
  chatReply?: string;
  strengthScore?: number;
  strengthLabel?: string;
};

const LOWERCASE = "abcdefghjkmnpqrstuvwxyz";
const UPPERCASE = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*_-+=?";
const PASSWORD_ALPHABET = `${LOWERCASE}${UPPERCASE}${DIGITS}${SYMBOLS}`;

function randomChar(source: string): string {
  const index = crypto.randomInt(0, source.length);
  return source[index] ?? source[0] ?? "x";
}

function shuffle(input: string): string {
  const chars = input.split("");
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = crypto.randomInt(0, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }
  return chars.join("");
}

function generateLocalPassword(siteName: string): string {
  const normalizedSite = (siteName || "secure")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 5);
  const siteToken = normalizedSite
    ? normalizedSite[0].toUpperCase() + normalizedSite.slice(1).toLowerCase()
    : "Vault";

  const required = [
    randomChar(UPPERCASE),
    randomChar(LOWERCASE),
    randomChar(DIGITS),
    randomChar(SYMBOLS),
  ];

  const randomTail = Array.from({ length: 16 }, () => randomChar(PASSWORD_ALPHABET)).join("");
  const rawPassword = `${siteToken}${required.join("")}${randomTail}`.slice(0, 24);
  return shuffle(rawPassword);
}

function isStrongPassword(password?: string): password is string {
  if (!password) return false;
  if (password.length < 20 || password.length > 32) return false;

  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return hasUppercase && hasLowercase && hasDigit && hasSymbol;
}

function estimatePasswordStrength(password: string): {
  score: number;
  label: string;
  crackTimeEstimate: string;
  strengthTips: string[];
  passwordPolicyNote: string;
} {
  const value = password.trim();
  if (!value) {
    return {
      score: 0,
      label: "À tester",
      crackTimeEstimate: "Veuillez saisir un mot de passe pour obtenir une estimation.",
      strengthTips: ["Ajoutez au moins 16 caractères.", "Mélangez lettres, chiffres et symboles.", "Évitez les mots ordinaires ou basés sur vos données personnelles."],
      passwordPolicyNote: "Un mot de passe vide ne peut pas être considéré comme robuste.",
    };
  }

  let score = 0;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasDigit = /[0-9]/.test(value);
  const hasSymbol = /[^A-Za-z0-9]/.test(value);
  const length = value.length;

  if (length >= 24) score += 28;
  else if (length >= 16) score += 20;
  else if (length >= 12) score += 12;
  else score += 6;

  if (hasUppercase) score += 10;
  if (hasLowercase) score += 10;
  if (hasDigit) score += 10;
  if (hasSymbol) score += 10;

  if (!/(password|azerty|qwerty|letmein|admin|12345|motdepasse)/i.test(value)) score += 10;
  if (length > 8 && !/(.)\1{2,}/.test(value)) score += 8;

  const clampedScore = Math.max(0, Math.min(100, score));
  let label = "Faible";
  let crackTimeEstimate = "Quelques minutes à quelques heures";

  if (clampedScore >= 85) {
    label = "Très fort";
    crackTimeEstimate = "Plusieurs années à plusieurs décennies selon la méthode d'attaque";
  } else if (clampedScore >= 65) {
    label = "Fort";
    crackTimeEstimate = "Plusieurs mois à plusieurs années";
  } else if (clampedScore >= 40) {
    label = "Moyen";
    crackTimeEstimate = "Plusieurs jours à plusieurs mois";
  }

  return {
    score: clampedScore,
    label,
    crackTimeEstimate,
    strengthTips: [
      "Ajoutez au moins 4 caractères supplémentaires si vous souhaitez gagner en robustesse.",
      "N’utilisez jamais ce mot de passe ailleurs.",
      "Stockez-le dans un gestionnaire de mots de passe sécurisé.",
    ],
    passwordPolicyNote: "Un mot de passe robuste combine longueur, variété de caractères et absence de motifs évidents.",
  };
}

function buildFallbackAdvice(payload: { email?: string; siteName?: string; breachCount?: number; score?: number; intent?: string; password?: string; chatPrompt?: string; integrity?: unknown }): AssistantAdvice {
  const siteName = payload.siteName || "ce service";
  const password = generateLocalPassword(siteName);

  if (payload.intent === "password-strength-test") {
    const strength = estimatePasswordStrength(String(payload.password ?? ""));
    return {
      conclusion: `Le mot de passe soumis est évalué comme ${strength.label.toLowerCase()} pour l’instant.`,
      passwordAdvice: `Générez un mot de passe plus long et unique si vous souhaitez réduire sa cassabilité.`,
      strengthTips: strength.strengthTips,
      crackTimeEstimate: strength.crackTimeEstimate,
      timeline: [
        { title: "Évaluation locale", summary: "Le score est calculé à partir de la longueur, de la variété des caractères et de la présence de motifs courants." },
        { title: "Renforcement recommandé", summary: "Ajoutez au moins un caractère spécial, des chiffres et un mélange de casse pour gagner en robustesse." },
      ],
      passwordStrength: strength.label,
      passwordPolicyNote: strength.passwordPolicyNote,
      nextSteps: [
        "Conservez ce mot de passe dans un gestionnaire sécurisé.",
        "Évitez de le réutiliser sur d’autres services.",
        "Activez la 2FA si elle est disponible.",
      ],
      strengthScore: strength.score,
      strengthLabel: strength.label,
    };
  }

  if (payload.intent === "threat-intel") {
    return {
      conclusion: "La veille se concentre sur les sources vérifiables et les signaux de compromission qui sont réellement corrélés à votre profil.",
      passwordAdvice: "Protégez en priorité vos identifiants et votre boîte mail, car ce sont les premiers vecteurs d’exploitation.",
      strengthTips: [
        "Valorisez les sources de confiance comme CISA KEV, NVD, CERT-FR et MITRE.",
        "Surveillez les comptes qui ont déjà été exposés dans des fuites.",
        "Agissez sur les services où des mots de passe ou des données sensibles ont déjà été retrouvés.",
      ],
      crackTimeEstimate: "Les signaux d’alerte doivent être traités dès leur détection pour limiter la propagation des risques.",
      timeline: [
        { title: "Agrégation des sources", summary: "Les données sont reliées à des snapshots hachés afin d’identifier toute modification non autorisée." },
        { title: "Analyse prioritaire", summary: "Les signaux les plus urgents sont ceux liés à des mots de passe, des données bancaires et des identités exposées." },
      ],
      threatIntelSummary: "Les sources ouvertes et le dataset local sont combinés pour créer une vue plus fiable de la menace que l’affichage purement aléatoire de données génériques.",
      threatFlags: ["Dataset local intégré", "Sources publiques vérifiées", "Chaîne d’intégrité active"],
      threatActions: ["Vérifier l’exposition des mots de passe", "Surveiller les services touchés", "Activer la 2FA sur les comptes sensibles"],
    };
  }

  if (payload.intent === "chat") {
    return {
      conclusion: "Je peux aider à analyser votre exposition, tester un mot de passe ou préparer une action de remédiation.",
      passwordAdvice: "Partagez le contexte précis de votre question pour obtenir une réponse plus utile.",
      strengthTips: ["Précisez le service concerné si vous cherchez une action ciblée.", "Donnez la forme du risque observé pour obtenir une réponse concrète.", "Demandez une estimation de temps si le besoin porte sur la cassabilité d’un mot de passe."],
      crackTimeEstimate: "L’assistant reste disponible pour vous guider selon le niveau de gravité du problème.",
      timeline: [],
      chatReply: payload.chatPrompt
        ? `Je vous aide à traiter ce point : ${payload.chatPrompt}`
        : "Je peux vous aider à évaluer vos risques, tester un mot de passe ou préparer une réponse opérationnelle.",
    };
  }

  return {
    conclusion: `Une mise à jour de mot de passe est recommandée pour ${siteName}. Protégez immédiatement votre compte et activez la 2FA si elle est disponible.`,
    passwordAdvice: `Utilisez un mot de passe unique de 20+ caractères avec un mélange de lettres, chiffres et symboles, comme ${password}.`,
    strengthTips: [
      "Évitez les mots de passe réutilisés ou basés sur des données personnelles.",
      "Activez l’authentification à deux facteurs sur le compte concerné.",
      "Conservez ce mot de passe dans un gestionnaire sécurisé.",
    ],
    crackTimeEstimate: "Estimation prudente : plusieurs centaines d’années pour un mot de passe généré de cette force, contre quelques heures à quelques jours pour un mot de passe court et prévisible.",
    timeline: [
      { title: "Alerte de sécurité", summary: "Le compte a été identifié comme exposé ou potentiellement vulnérable." },
      { title: "Renouvellement recommandé", summary: "Le remplacement du mot de passe doit être effectué dès que possible sur le service concerné." },
    ],
    newPassword: password,
    passwordStrength: "Très fort",
    passwordPolicyNote: "Ce mot de passe est construit pour dépasser la plupart des exigences de complexité de base tout en restant mémorisable via une structure logique.",
    nextSteps: [
      "Appliquez ce mot de passe sur le site concerné.",
      "Mettez à jour tous les autres comptes où ce mot de passe était réutilisé.",
      "Vérifiez les alertes de connexion et activez la 2FA.",
    ],
    siteRecommendation: `Changez immédiatement le mot de passe de ${siteName} et conservez une copie sécurisée dans un gestionnaire de mots de passe.`,
  };
}

function parseJsonResponse(raw: string): AssistantAdvice {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        conclusion: typeof parsed.conclusion === "string" ? parsed.conclusion : "Sécurisez immédiatement vos accès et changez les mots de passe exposés.",
        passwordAdvice: typeof parsed.passwordAdvice === "string" ? parsed.passwordAdvice : "Changez votre mot de passe principal et utilisez un mot de passe unique et long.",
        strengthTips: Array.isArray(parsed.strengthTips) ? parsed.strengthTips.filter((item): item is string => typeof item === "string") : [],
        crackTimeEstimate: typeof parsed.crackTimeEstimate === "string" ? parsed.crackTimeEstimate : "Moins d’une heure avec un mot de passe faible.",
        timeline: Array.isArray(parsed.timeline)
          ? parsed.timeline.filter((item): item is { title: string; summary: string } => Boolean(item && typeof item.title === "string" && typeof item.summary === "string"))
          : [],
        newPassword: typeof parsed.newPassword === "string" ? parsed.newPassword : undefined,
        passwordStrength: typeof parsed.passwordStrength === "string" ? parsed.passwordStrength : undefined,
        passwordPolicyNote: typeof parsed.passwordPolicyNote === "string" ? parsed.passwordPolicyNote : undefined,
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter((item): item is string => typeof item === "string") : [],
        siteRecommendation: typeof parsed.siteRecommendation === "string" ? parsed.siteRecommendation : undefined,
        threatIntelSummary: typeof parsed.threatIntelSummary === "string" ? parsed.threatIntelSummary : undefined,
        threatFlags: Array.isArray(parsed.threatFlags) ? parsed.threatFlags.filter((item): item is string => typeof item === "string") : [],
        threatActions: Array.isArray(parsed.threatActions) ? parsed.threatActions.filter((item): item is string => typeof item === "string") : [],
        chatReply: typeof parsed.chatReply === "string" ? parsed.chatReply : undefined,
        strengthScore: typeof parsed.strengthScore === "number" ? parsed.strengthScore : undefined,
        strengthLabel: typeof parsed.strengthLabel === "string" ? parsed.strengthLabel : undefined,
      };
    }
  } catch {
    // fall through to fallback
  }

  return {
    conclusion: "Une fuite a été détectée. Priorité absolue : sécuriser l’email principal, changer les mots de passe exposés et activer une 2FA forte.",
    passwordAdvice: "Utilisez un mot de passe unique de 16 caractères minimum, mêlant chiffres, lettres et symboles, puis stockez-le dans un gestionnaire de mots de passe.",
    strengthTips: [
      "Activer la 2FA avec TOTP ou une clé physique.",
      "Ne jamais réutiliser un ancien mot de passe.",
      "Vérifier les sessions actives et les appareils connectés.",
    ],
    crackTimeEstimate: "Un mot de passe court et simple peut être cassé en quelques minutes à quelques heures. Un mot de passe long et unique est beaucoup plus résistant.",
    timeline: [],
  };
}

function finalizePasswordAdvice(payload: { siteName?: string }, advice: AssistantAdvice): AssistantAdvice {
  const generatedPassword = isStrongPassword(advice.newPassword)
    ? advice.newPassword
    : generateLocalPassword(payload.siteName || "secure");

  return {
    ...advice,
    newPassword: generatedPassword,
    passwordStrength: advice.passwordStrength || "Très fort",
    passwordAdvice: typeof advice.passwordAdvice === "string" && advice.passwordAdvice.trim().length > 0
      ? advice.passwordAdvice.replace(/comme\s+[^.]+/i, `comme ${generatedPassword}`)
      : `Utilisez un mot de passe unique de 20+ caractères avec un mélange de lettres, chiffres et symboles, comme ${generatedPassword}.`,
    passwordPolicyNote: advice.passwordPolicyNote || "Mot de passe généré côté serveur avec une politique forte: longueur élevée, mélange complet de caractères et aléa cryptographique.",
  };
}

function extractModelText(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.response === "string") return parsed.response;
    if (typeof parsed?.message?.content === "string") return parsed.message.content;
    if (typeof parsed?.candidates?.[0]?.content?.parts?.[0]?.text === "string") {
      return parsed.candidates[0].content.parts[0].text;
    }
  } catch {
    // fall through to raw text
  }

  return raw;
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 600,
        },
      }),
    },
  );

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || "Gemini request failed");
  }

  return responseText;
}

async function callOllama(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL?.trim() || "llama3.2:latest";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: "json",
      options: {
        temperature: 0.7,
        top_p: 0.95,
      },
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(responseText || "Ollama request failed");
  }

  return responseText;
}

export const Route = createFileRoute("/api/ai-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        dotenv.config();

        try {
          const payload = (await request.json()) as {
            email?: string;
            score?: number;
            breachCount?: number;
            dataTypes?: string[];
            breachSummary?: string[];
            intent?: string;
            siteName?: string;
            password?: string;
            chatPrompt?: string;
            integrity?: unknown;
          };

          const apiKey = process.env.AI_AGENT_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();

          const intent = payload.intent ?? "";
          const isPasswordFlow = intent === "password-reset";
          const isPasswordStrength = intent === "password-strength-test";
          const isThreatIntel = intent === "threat-intel";
          const isChat = intent === "chat";

          const prompt = isPasswordFlow
            ? `Tu es un assistant de sécurité cyber premium. Réponds en français, de façon concise, utile et rassurante.\n\nProfil analysé : ${payload.email ?? "inconnu"}\nSite concerné : ${payload.siteName ?? "un service en ligne"}\nContexte : une fuite de mot de passe a été détectée ou suspectée.\n\nFournis un objet JSON strict avec ces champs : conclusion, passwordAdvice, strengthTips (tableau de 3 chaînes), crackTimeEstimate, timeline (tableau de 2 objets {title, summary}), newPassword (une chaîne de 20 à 24 caractères), passwordStrength (ex. "Très fort"), passwordPolicyNote (une courte note sur la politique de création), nextSteps (tableau de 3 chaînes), siteRecommendation (une phrase rapide d'action). Le newPassword doit être robuste, unique et facile à mémoriser via une structure logique. Le crackTimeEstimate doit estimer un temps de cassage approximatif en heures, jours ou années.`
            : isPasswordStrength
              ? `Tu es un évaluateur de mots de passe cyber. Réponds en français, de façon concise et réaliste.\n\nMot de passe soumis : ${payload.password ?? ""}\n\nFournis un objet JSON strict avec ces champs : conclusion, passwordAdvice, strengthTips (tableau de 3 chaînes), crackTimeEstimate, timeline (tableau de 2 objets {title, summary}), passwordStrength (ex. "Très fort"), passwordPolicyNote (une courte note), nextSteps (tableau de 3 chaînes), strengthScore (nombre 0-100), strengthLabel (ex. "Fort"). Le crackTimeEstimate doit estimer un temps de cassage approximatif en heures, jours, mois ou années.`
              : isThreatIntel
                ? `Tu es un analyste de renseignement cyber. Réponds en français, concis et orienté action.\n\nContexte : ${JSON.stringify(payload.integrity ?? {})}\n\nFournis un objet JSON strict avec ces champs : conclusion, threatIntelSummary, threatFlags (tableau de 3 chaînes), threatActions (tableau de 3 chaînes), strengthTips (tableau de 3 chaînes), timeline (tableau de 2 objets {title, summary}). Le message doit expliquer quelles sources sont fiables et quelles actions prioritaires doivent être menées.`
                : isChat
                  ? `Tu es un assistant de sécurité cyber. Réponds en français, de façon utile et concise à la question suivante : ${payload.chatPrompt ?? "Explique-moi le risque."}\n\nFournis un objet JSON strict avec ces champs : conclusion, chatReply (une réponse courte et pratique), strengthTips (tableau de 3 chaînes), timeline (tableau de 2 objets {title, summary}).`
                  : `Tu es un assistant de sécurité cyber. Réponds en français, de façon concise et utile.\n\nProfil analysé : ${payload.email ?? "inconnu"}\nScore d'exposition : ${payload.score ?? 0}/100\nNombre de fuites détectées : ${payload.breachCount ?? 0}\nTypes de données exposées : ${(payload.dataTypes ?? []).join(", ") || "aucune"}\n\nFournis un objet JSON strict avec ces champs : conclusion, passwordAdvice, strengthTips (tableau de 3 chaînes), crackTimeEstimate, timeline (tableau de 2 objets {title, summary}). La conclusion doit dire clairement ce qu'il faut faire immédiatement. Le passwordAdvice doit proposer une amélioration concrète de mot de passe. Le crackTimeEstimate doit donner une estimation approximative en temps. Le timeline doit décrire un mini historique de la fuite détectée.`;

          let responseText = "";
          try {
            if (apiKey) {
              responseText = await callGemini(prompt, apiKey);
            } else {
              responseText = await callOllama(prompt);
            }
          } catch (providerError) {
            const message = providerError instanceof Error ? providerError.message : "AI provider unavailable";
            console.warn("AI provider fallback", message);
            responseText = "";
          }

          let parsed: AssistantAdvice | null = null;
          if (responseText) {
            const modelText = extractModelText(responseText);
            parsed = parseJsonResponse(modelText);
          }

          if (!parsed) {
            parsed = buildFallbackAdvice(payload);
          }

          if (isPasswordFlow) {
            parsed = finalizePasswordAdvice(payload, parsed ?? buildFallbackAdvice(payload));
          } else if (isPasswordStrength) {
            const fallback = buildFallbackAdvice(payload);
            parsed = {
              ...fallback,
              ...parsed,
              passwordStrength: parsed?.passwordStrength || parsed?.strengthLabel || fallback.passwordStrength,
              crackTimeEstimate: parsed?.crackTimeEstimate || fallback.crackTimeEstimate,
              strengthTips: parsed?.strengthTips?.length ? parsed.strengthTips : fallback.strengthTips,
              passwordPolicyNote: parsed?.passwordPolicyNote || fallback.passwordPolicyNote,
              strengthScore: parsed?.strengthScore ?? fallback.strengthScore,
              strengthLabel: parsed?.strengthLabel || fallback.strengthLabel,
            };
          }

          return new Response(JSON.stringify({ ok: true, advice: parsed ?? buildFallbackAdvice(payload) }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown AI assistant error";
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
