import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Mail, KeyRound, Phone, Home, ShieldCheck, AtSign, Globe, CreditCard, Cake, HelpCircle,
  AlertTriangle, Bell, BellRing, Check, ChevronRight, Sparkles, Zap, Activity, ExternalLink, ShieldAlert, Lock, Smartphone, Copy, SendHorizonal, MessageCircle
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area, CartesianGrid
} from "recharts";
import { SiteNav, SiteFooter } from "@/components/site-nav";
import teamBravo from "../teambravo.png";
import { useAuth } from "@/lib/auth-context";
import { severityColor, severityHex } from "@/lib/mock-data";
import { getLeakDatasetSummary } from "@/lib/leak-dataset";
import { buildRemediationTasks, getSupportedRemediationSites, getUnsupportedPasswordSites, type RemediationTask } from "@/lib/remediation-sites";
import { sendAlertEmail } from "@/lib/send-alert-email";
import { evaluatePasswordStrength } from "@/lib/password-strength";

const ICONS: Record<string, React.ElementType> = {
  Mail, KeyRound, Phone, Home, ShieldCheck, AtSign, Globe, CreditCard, Cake, HelpCircle,
};

type RemediationStatus = "detected" | "consented" | "launched" | "completed" | "blocked";

type RemediationRuntimeState = {
  status: RemediationStatus;
  consentGranted: boolean;
  lastOpenedAt?: string;
  completedAt?: string;
};

type DynamicRecommendation = {
  id: string;
  priority: "Critique" | "Élevée" | "Moyenne" | "Faible";
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel?: string;
};

const REMEDIATION_STORAGE_PREFIX = "afterleak-remediation";

const REMEDIATION_STATUS_META: Record<RemediationStatus, { label: string; tone: string }> = {
  detected: { label: "Détecté", tone: "border-warning/30 bg-warning/10 text-warning" },
  consented: { label: "Consentement validé", tone: "border-primary/30 bg-primary/10 text-primary" },
  launched: { label: "Session ouverte", tone: "border-danger/30 bg-danger/10 text-danger" },
  completed: { label: "Traité", tone: "border-success/30 bg-success/10 text-success" },
  blocked: { label: "Bloqué", tone: "border-critical/30 bg-critical/10 text-critical" },
};

function getDefaultRemediationState(): RemediationRuntimeState {
  return {
    status: "detected",
    consentGranted: false,
  };
}

function normalizeRemediationState(value: unknown): RemediationRuntimeState | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<RemediationRuntimeState>;
  if (!candidate.status || !(candidate.status in REMEDIATION_STATUS_META)) return null;

  return {
    status: candidate.status,
    consentGranted: Boolean(candidate.consentGranted),
    lastOpenedAt: typeof candidate.lastOpenedAt === "string" ? candidate.lastOpenedAt : undefined,
    completedAt: typeof candidate.completedAt === "string" ? candidate.completedAt : undefined,
  };
}

type LeakJourneyStep = {
  title: string;
  label: string;
  detail: string;
};

export const Route = createFileRoute("/dashboard/$email")({
  head: ({ params }) => ({
    meta: [
      { title: `Exposition de ${params.email} — AfterLeak` },
      { name: "description", content: "Tableau de bord d'exposition cyber personnalisé." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { email } = Route.useParams();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const leakSummary = useMemo(() => getLeakDatasetSummary(email ?? ""), [email]);
  const passwordExposureBreaches = useMemo(
    () => leakSummary.breaches.filter((breach) => breach.exposedFields.includes("mot_de_passe")),
    [leakSummary.breaches],
  );
  const remediationTasks = useMemo(() => buildRemediationTasks(leakSummary.breaches), [leakSummary.breaches]);
  const unsupportedPasswordSites = useMemo(() => getUnsupportedPasswordSites(leakSummary.breaches), [leakSummary.breaches]);
  const remediationCatalog = useMemo(() => getSupportedRemediationSites(), []);
  const score = leakSummary.score;
  const telegramSignalCount = leakSummary.telegramSignalCount;
  const hasExposureSignals = leakSummary.breachCount > 0 || telegramSignalCount > 0;
  const isSafe = !hasExposureSignals;
  const breachCount = leakSummary.breachCount;
  const statusLabel = isSafe
    ? "Aucun risque détecté"
    : score >= 70
      ? "Risque critique"
      : score >= 40
        ? "Risque élevé"
        : telegramSignalCount > 0 && breachCount === 0
          ? "Signal externe détecté"
          : score >= 20
            ? "Risque modéré"
            : "Risque faible";
  const statusToneClass = isSafe
    ? "bg-success/15 border-success/30 text-success"
    : "bg-danger/15 border-danger/30 text-danger";
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [notifGranted, setNotifGranted] = useState<NotificationPermission | "unsupported">("default");
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<string | null>(null);
  const [recipientEmailInput, setRecipientEmailInput] = useState("");
  const [leakJourney, setLeakJourney] = useState<LeakJourneyStep[] | null>(null);
  const [assistantAdvice, setAssistantAdvice] = useState<null | {
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
  }>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [passwordStrengthInput, setPasswordStrengthInput] = useState("");
  const [passwordStrengthLoading, setPasswordStrengthLoading] = useState(false);
  const [passwordStrengthResult, setPasswordStrengthResult] = useState<null | {
    conclusion: string;
    passwordAdvice: string;
    crackTimeEstimate: string;
    passwordStrength?: string;
    strengthScore?: number;
    strengthLabel?: string;
    strengthTips: string[];
    nextSteps?: string[];
  }>(null);
  const livePasswordStrength = useMemo(() => evaluatePasswordStrength(passwordStrengthInput), [passwordStrengthInput]);
  const passwordRecommendationSummary = useMemo(() => {
    if (!passwordStrengthResult) {
      return {
        title: "Évaluation en attente",
        description: "Saisissez un mot de passe pour obtenir une recommandation adaptée à sa robustesse actuelle.",
        tone: "text-muted-foreground",
      };
    }

    const score = passwordStrengthResult.strengthScore ?? livePasswordStrength.score;
    if (score >= 85) {
      return {
        title: "Mot de passe déjà solide",
        description: "Le mot de passe semble robuste. L’accent devrait rester sur la continuité du bon usage, la 2FA et la non-réutilisation.",
        tone: "text-success",
      };
    }

    if (score >= 65) {
      return {
        title: "Mot de passe plutôt solide",
        description: "Le mot de passe est déjà correct, mais quelques améliorations peuvent encore renforcer sa résistance à long terme.",
        tone: "text-primary",
      };
    }

    return {
      title: "Mot de passe faible à moyen",
      description: "Le mot de passe devrait être allongé et rendu plus unique pour limiter sa cassabilité dans les attaques automatisées.",
      tone: "text-warning",
    };
  }, [livePasswordStrength.score, passwordStrengthResult]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "Je peux vous aider à analyser votre exposition, tester un mot de passe ou préparer une réponse de remédiation." },
  ]);
  const [passwordSite, setPasswordSite] = useState("");
  const [passwordPlanLoading, setPasswordPlanLoading] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [remediationState, setRemediationState] = useState<Record<string, RemediationRuntimeState>>({});
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pilotSiteId, setPilotSiteId] = useState("");
  const [integrityReport, setIntegrityReport] = useState<null | {
    blockIndex: number;
    previousHash: string;
    currentHash: string;
    capturedAt: string;
    sourceCount: number;
    integrityStatus: "ok" | "tampered";
    verification: { valid: boolean; issue?: string };
    sources: Array<{
      source: string;
      status: "ok" | "unavailable" | "skipped";
      fetchedAt: string;
      recordCount: number;
      digest: string;
      note?: string;
      sample?: Array<{ id: string; title: string }>;
    }>;
  }>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityPhase, setIntegrityPhase] = useState<"idle" | "verifying" | "ready">("idle");

  const showResults = integrityPhase === "ready";
  const integrityBadgeClass = integrityLoading
    ? "bg-warning/10 text-warning"
    : integrityReport?.verification.valid === false || integrityReport?.integrityStatus === "tampered"
      ? "bg-danger/15 border-danger/30 text-danger"
      : integrityReport?.integrityStatus === "ok"
        ? "bg-success/10 text-success"
        : "bg-warning/10 text-warning";

  useEffect(() => {
    if (isSafe || !leakSummary.breaches.length) {
      setLeakJourney(null);
      return;
    }

    const breachList = [...leakSummary.breaches];
    const preferredOrigin = breachList.find((breach) => /twitter|x/i.test(breach.company))
      ?? breachList.find((breach) => /dailymotion|linkedin|blablacar/i.test(breach.company))
      ?? breachList[0];
    const remainingBreaches = breachList.filter((breach) => breach.company !== preferredOrigin?.company);
    const relay = remainingBreaches.find((breach) => breach.exposedFields.some((field) => preferredOrigin?.exposedFields.includes(field)))
      ?? remainingBreaches[0]
      ?? preferredOrigin;
    const impact = remainingBreaches.find((breach) => breach.company !== relay?.company)
      ?? relay
      ?? preferredOrigin;

    const exposedFields = [...new Set(breachList.flatMap((breach) => breach.exposedFields))].slice(0, 2);
    const attackVectors = [...new Set(breachList.flatMap((breach) => breach.attackVectors ?? []))].slice(0, 2);
    const targetLabel = email ?? "ce profil";
    const originCompany = preferredOrigin?.company ?? "Twitter/X";
    const relayCompany = relay?.company ?? "un relais secondaire";
    const impactCompany = impact?.company ?? "un acteur de revente";
    const originField = exposedFields[0] ?? "des identifiants";
    const escalationField = exposedFields[1] ?? originField;

    setLeakJourney([
      {
        title: "Point d’entrée",
        label: `${originCompany} sert de point d’entrée initial`,
        detail: `Le premier signal OSINT apparaît sur ${originCompany}, où ${originField} ont été observés en relation avec ${targetLabel}.`,
      },
      {
        title: "Escalade",
        label: `${relayCompany} transforme la piste en fil d’actualité`,
        detail: `Le second nœud réutilise ${escalationField} et corrèle la diffusion vers un relais plus exploitable.`,
      },
      {
        title: "Impact",
        label: `${impactCompany} concrétise le risque opérationnel`,
        detail: `${attackVectors[0] ?? "une piste d’exploitation"} devient crédible à ce stade si l’exposition n’est pas contenue rapidement.`,
      },
    ]);
  }, [email, isSafe, leakSummary.breaches, leakSummary.breachCount]);

  const primaryRemediationTask = remediationTasks[0] ?? null;
  const activeRemediationTask = remediationTasks.find((task) => task.id === activeTaskId) ?? primaryRemediationTask;
  const activeRemediationState = activeRemediationTask
    ? remediationState[activeRemediationTask.id] ?? getDefaultRemediationState()
    : null;
  const pilotSite = remediationCatalog.find((site) => site.id === pilotSiteId) ?? remediationCatalog[0] ?? null;
  const recommendationItems = useMemo<DynamicRecommendation[]>(() => {
    const items: DynamicRecommendation[] = [];

    if (passwordExposureBreaches.length) {
      items.push({
        id: "password-rotation",
        priority: "Critique",
        title: `Traiter ${passwordExposureBreaches.length} fuite${passwordExposureBreaches.length > 1 ? "s" : ""} avec mot de passe`,
        description: `Les services touchés incluent ${passwordExposureBreaches.slice(0, 3).map((breach) => breach.company).join(", ")}${passwordExposureBreaches.length > 3 ? " et d'autres" : ""}. Priorité à la rotation et à la révocation des sessions.`,
        icon: KeyRound,
        actionLabel: primaryRemediationTask ? `Ouvrir ${primaryRemediationTask.site.name}` : undefined,
      });
    }

    const financialExposure = leakSummary.riskCategories.find((category) => ["données_bancaires", "IBAN"].includes(category.key));
    if (financialExposure?.count) {
      items.push({
        id: "financial-watch",
        priority: financialExposure.severity === "critique" ? "Critique" : "Élevée",
        title: "Surveiller les moyens de paiement exposés",
        description: `${financialExposure.count} exposition${financialExposure.count > 1 ? "s" : ""} touche${financialExposure.count > 1 ? "nt" : ""} des données financières. Vérifiez cartes, prélèvements et alertes bancaires.`,
        icon: CreditCard,
      });
    }

    const identityExposure = leakSummary.riskCategories.find((category) => ["identité", "numéro_sécu", "permis_conduire"].includes(category.key));
    if (identityExposure?.count) {
      items.push({
        id: "identity-watch",
        priority: identityExposure.severity === "critique" ? "Élevée" : "Moyenne",
        title: "Placer le profil sous veille d'usurpation",
        description: "Des données d'identité sensibles sont visibles dans la base. Préparez une preuve de fuite et surveillez toute démarche bancaire ou administrative inhabituelle.",
        icon: ShieldAlert,
      });
    }

    const emailExposure = leakSummary.riskCategories.find((category) => category.key === "email");
    if (emailExposure?.count) {
      items.push({
        id: "mail-hardening",
        priority: "Moyenne",
        title: "Durcir la boîte mail pivot",
        description: `L'adresse principale apparaît dans ${emailExposure.count} fuite${emailExposure.count > 1 ? "s" : ""}. Renforcez la 2FA et surveillez les réinitialisations non sollicitées.`,
        icon: Mail,
      });
    }

    if (!items.length) {
      items.push({
        id: "baseline-monitoring",
        priority: "Faible",
        title: "Maintenir la veille active",
        description: "Aucune action critique n'est visible pour le moment. Conservez la surveillance, les accès secondaires et la 2FA sous contrôle.",
        icon: Activity,
      });
    }

    return items.slice(0, 4);
  }, [passwordExposureBreaches, leakSummary.riskCategories, primaryRemediationTask]);
  const availableNotificationChannels = useMemo(() => {
    const channels = [
      {
        name: "Push navigateur",
        on: notifGranted === "granted",
        detail: notifGranted === "granted" ? "Notification locale prête" : "Nécessite l'autorisation navigateur",
      },
      {
        name: "Email",
        on: true,
        detail: "Résumé envoyé via le flux email réellement configuré",
      },
    ];

    if (telegramSignalCount > 0) {
      channels.push({
        name: "Veille externe",
        on: true,
        detail: `${telegramSignalCount} signal${telegramSignalCount > 1 ? "s" : ""} corrélé${telegramSignalCount > 1 ? "s" : ""} à ce profil dans la veille temps réel`,
      });
    }

    return channels;
  }, [notifGranted, telegramSignalCount]);
  const leadRiskCategory = useMemo(() => {
    return [...leakSummary.riskCategories]
      .sort((left, right) => right.count - left.count)
      .sort((left, right) => {
        const weight: Record<typeof left.severity, number> = { critique: 4, élevé: 3, moyen: 2, faible: 1 };
        return weight[right.severity] - weight[left.severity];
      })[0] ?? null;
  }, [leakSummary.riskCategories]);
  const highlightedBreaches = leakSummary.breaches.slice(0, 3);
  const heroHeadline = isSafe
    ? "Posture propre. Aucune fuite exploitable n'est visible à cet instant."
    : passwordExposureBreaches.length > 0
      ? `Vos signaux les plus agressifs viennent de ${highlightedBreaches.map((breach) => breach.company).slice(0, 2).join(" et ")}.`
      : leadRiskCategory
        ? `${leadRiskCategory.label} domine votre surface d'exposition actuelle.`
        : "Votre profil contient des signaux d'exposition à surveiller de près.";
  const heroSubcopy = isSafe
    ? "L'analyse Team Bravo reste orientée veille et durcissement. Le tableau de bord ne pousse aucune action artificielle tant qu'aucune fuite réutilisable n'est détectée."
    : passwordExposureBreaches.length > 0
      ? "Les fuites avec mot de passe existent, mais nous n'affichons plus de faux parcours quand aucun site pilotable n'est réellement présent pour ce profil."
      : "Le bon angle ici n'est pas la rotation de mot de passe, mais la réduction des risques administratifs, médicaux ou d'identité révélés dans les sources observées.";
  const liveWatchFeed = useMemo(() => {
    const breachItems = leakSummary.breaches.slice(0, 4).map((breach, index) => ({
      id: `${breach.id}-feed`,
      tag: breach.severity === "critique" ? "ALERTE" : breach.severity === "élevé" ? "SURVEILLANCE" : "SIGNAL",
      title: breach.company,
      summary: breach.aiSummary,
      age: breach.date,
      delay: index * 0.08,
    }));

    if (telegramSignalCount > 0) {
      breachItems.unshift({
        id: "telegram-watch",
        tag: "VEILLE",
        title: "Canal externe surveillé",
        summary: `Un signal externe est actuellement corrélé à ce profil. Il sert de point d'accroche de veille en plus de la base principale.`,
        age: "temps réel",
        delay: 0,
      });
    }

    return breachItems;
  }, [leakSummary.breaches, telegramSignalCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/auth/login" });
      return;
    }

    setRecipientEmailInput(user?.email ?? email ?? "");
    if (!passwordSite) {
      const suggestedSite = primaryRemediationTask?.site.name || leakSummary.breaches[0]?.company || (email?.split("@")?.[1] ? `site-${email.split("@")[1]}` : "service en ligne");
      setPasswordSite(suggestedSite);
    }

    if (!activeTaskId && primaryRemediationTask) {
      setActiveTaskId(primaryRemediationTask.id);
    }

    if (!pilotSiteId && remediationCatalog[0]) {
      setPilotSiteId(remediationCatalog[0].id);
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifGranted("unsupported");
      return;
    }
    setNotifGranted(Notification.permission);
  }, [isAuthenticated, navigate, user?.email, email, leakSummary.breaches, passwordSite, primaryRemediationTask, activeTaskId, pilotSiteId, remediationCatalog]);

  useEffect(() => {
    let cancelled = false;
    const targetEmail = email ?? user?.email ?? "";

    if (!isAuthenticated || !targetEmail) {
      setIntegrityReport(null);
      setIntegrityLoading(false);
      setIntegrityPhase("idle");
      return;
    }

    async function loadIntegrityReport() {
      if (typeof window === "undefined") return;
      setIntegrityLoading(true);
      setIntegrityPhase("verifying");
      try {
        const response = await fetch("/api/integrity", { credentials: "same-origin", cache: "no-store" });
        const payload = await response.json() as { ok?: boolean; report?: typeof integrityReport };
        if (!cancelled && payload?.ok && payload.report) {
          await new Promise((resolve) => window.setTimeout(resolve, 1200));
          setIntegrityReport(payload.report);
        }
      } catch {
        if (!cancelled) {
          setIntegrityReport(null);
        }
      } finally {
        if (!cancelled) {
          setIntegrityLoading(false);
          setIntegrityPhase("ready");
        }
      }
    }

    void loadIntegrityReport();

    return () => {
      cancelled = true;
    };
  }, [email, user?.email, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined" || !email) return;

    const storageKey = `${REMEDIATION_STORAGE_PREFIX}:${email.toLowerCase()}`;
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const nextState = remediationTasks.reduce<Record<string, RemediationRuntimeState>>((acc, task) => {
        const restored = normalizeRemediationState(parsed?.[task.id]);
        acc[task.id] = restored ?? getDefaultRemediationState();
        return acc;
      }, {});
      setRemediationState(nextState);
    } catch {
      setRemediationState(
        remediationTasks.reduce<Record<string, RemediationRuntimeState>>((acc, task) => {
          acc[task.id] = getDefaultRemediationState();
          return acc;
        }, {}),
      );
    }
  }, [email, remediationTasks]);

  useEffect(() => {
    if (typeof window === "undefined" || !email || !Object.keys(remediationState).length) return;
    const storageKey = `${REMEDIATION_STORAGE_PREFIX}:${email.toLowerCase()}`;
    window.localStorage.setItem(storageKey, JSON.stringify(remediationState));
  }, [email, remediationState]);

  useEffect(() => {
    if (!isAuthenticated || isSafe) {
      setAssistantAdvice(null);
      return;
    }

    let ignore = false;
    const runAssistant = async () => {
      setAssistantLoading(true);
      try {
        const response = await fetch("/api/ai-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email ?? user?.email ?? "",
            score,
            breachCount,
            dataTypes: leakSummary.riskCategories.map((category) => category.label),
            breachSummary: leakSummary.breaches.map((breach) => breach.company),
          }),
        });

        const body = await response.json();
        if (!ignore && response.ok && body?.advice) {
          setAssistantAdvice(body.advice);
        }
      } catch {
        if (!ignore) {
          setAssistantAdvice(null);
        }
      } finally {
        if (!ignore) {
          setAssistantLoading(false);
        }
      }
    };

    void runAssistant();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isSafe, email, user?.email, score, breachCount, leakSummary.riskCategories, leakSummary.breaches]);

  if (!isAuthenticated) {
    return null;
  }

  function patchRemediationState(taskId: string, nextState: Partial<RemediationRuntimeState>) {
    setRemediationState((current) => ({
      ...current,
      [taskId]: {
        ...(current[taskId] ?? getDefaultRemediationState()),
        ...nextState,
      },
    }));
  }

  async function generatePasswordPlan(siteOverride?: string) {
    const selectedSite = siteOverride || passwordSite || "un service en ligne";
    if (siteOverride && siteOverride !== passwordSite) {
      setPasswordSite(siteOverride);
    }

    setPasswordPlanLoading(true);
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email ?? user?.email ?? "",
          intent: "password-reset",
          siteName: selectedSite,
          score,
          breachCount,
          dataTypes: leakSummary.riskCategories.map((category) => category.label),
        }),
      });

      const body = await response.json();
      if (response.ok && body?.advice) {
        setAssistantAdvice(body.advice);
        return body.advice;
      }
    } catch {
      setAssistantAdvice(null);
    } finally {
      setPasswordPlanLoading(false);
    }

    return null;
  }

  async function copyPassword() {
    if (!assistantAdvice?.newPassword) return;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(assistantAdvice.newPassword);
      }
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 1800);
    } catch {
      setPasswordCopied(false);
    }
  }

  async function runPasswordStrengthCheck() {
    const password = passwordStrengthInput.trim();
    if (!password) {
      setPasswordStrengthResult(null);
      return;
    }

    setPasswordStrengthLoading(true);
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "password-strength-test", password }),
      });
      const body = await response.json();
      if (response.ok && body?.advice) {
        setPasswordStrengthResult({
          conclusion: body.advice.conclusion ?? "Évaluation de robustesse",
          passwordAdvice: body.advice.passwordAdvice ?? livePasswordStrength.passwordAdvice,
          crackTimeEstimate: body.advice.crackTimeEstimate ?? livePasswordStrength.crackTimeEstimate,
          passwordStrength: body.advice.passwordStrength ?? body.advice.strengthLabel ?? livePasswordStrength.label,
          strengthScore: body.advice.strengthScore ?? livePasswordStrength.score,
          strengthLabel: body.advice.strengthLabel ?? livePasswordStrength.label,
          strengthTips: body.advice.strengthTips ?? livePasswordStrength.strengthTips,
          nextSteps: body.advice.nextSteps ?? livePasswordStrength.nextSteps,
        });
        return;
      }
    } catch {
      // fall back to local evaluation below
    } finally {
      setPasswordStrengthLoading(false);
    }

    setPasswordStrengthResult({
      conclusion: "Évaluation locale en temps réel",
      passwordAdvice: livePasswordStrength.passwordAdvice,
      crackTimeEstimate: livePasswordStrength.crackTimeEstimate,
      passwordStrength: livePasswordStrength.label,
      strengthScore: livePasswordStrength.score,
      strengthLabel: livePasswordStrength.label,
      strengthTips: livePasswordStrength.strengthTips,
      nextSteps: livePasswordStrength.nextSteps,
    });
  }

  async function sendChatMessage() {
    const message = chatInput.trim();
    if (!message) return;

    setChatMessages((current) => [...current, { role: "user", content: message }]);
    setChatInput("");
    setChatLoading(true);

    try {
      setChatMessages((current) => [...current, { role: "assistant", content: "Je vérifie votre demande et je vous réponds dans un instant…" }]);
      const response = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ intent: "chat", chatPrompt: message }),
      });
      const body = await response.json();
      const reply = response.ok && body?.advice?.chatReply
        ? body.advice.chatReply
        : "Je peux vous aider à clarifier le risque et à préparer une réponse concrète.";
      setChatMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch {
      setChatMessages((current) => [...current, { role: "assistant", content: "Le canal d’assistance n’a pas répondu. Réessayez dans quelques instants." }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function launchAssistedRotation(task: RemediationTask) {
    const taskState = remediationState[task.id] ?? getDefaultRemediationState();
    if (!taskState.consentGranted) {
      patchRemediationState(task.id, { status: "blocked" });
      setEmailFeedback("Validez d'abord le consentement explicite avant d'ouvrir une session de remédiation assistée.");
      setEmailSent(false);
      return;
    }

    setActiveTaskId(task.id);
    const advice = await generatePasswordPlan(task.site.name);

    try {
      if (advice?.newPassword && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(advice.newPassword);
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 1800);
      }
    } catch {
      setPasswordCopied(false);
    }

    if (typeof window !== "undefined") {
      window.open(task.site.launchUrl, "_blank", "noopener,noreferrer");
    }

    patchRemediationState(task.id, {
      status: "launched",
      lastOpenedAt: new Date().toISOString(),
    });
  }

  function toggleTaskConsent(taskId: string, consentGranted: boolean) {
    patchRemediationState(taskId, {
      consentGranted,
      status: consentGranted ? "consented" : "detected",
    });
  }

  function markTaskComplete(taskId: string) {
    patchRemediationState(taskId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  }

  function markTaskBlocked(taskId: string) {
    patchRemediationState(taskId, { status: "blocked" });
  }

  function buildLeakRecap(recipientEmail: string) {
    const topLeaks = leakSummary.breaches.slice(0, 3).map((breach) => `- ${breach.company}: ${breach.severity} (${breach.aiSummary})`).join("\n");
    const highRiskCategories = leakSummary.riskCategories
      .slice(0, 3)
      .map((category) => `${category.label}: ${category.count} éléments exposés`)
      .join("; ");

    const recommendationLine = isSafe
      ? "Recommandation prioritaire : continuez à surveiller vos accès et gardez vos habitudes de sécurité à jour."
      : "Recommandation prioritaire : changez immédiatement les mots de passe des comptes exposés et activez la surveillance en continu.";

    return [
      `Bonjour ${user?.name ?? "utilisateur"},`,
      "",
      isSafe ? "Voici votre récapitulatif Team Bravo : aucune exposition vérifiée n’a été détectée pour votre profil." : "Voici votre récapitulatif Team Bravo :",
      `Adresse analysée : ${recipientEmail}`,
      `Score d'exposition : ${score}/100`,
      `Fuites détectées : ${leakSummary.breachCount}`,
      `Signaux externes : ${telegramSignalCount}`,
      `Catégories à risque : ${highRiskCategories || "Aucune"}`,
      isSafe ? "Sources principales : aucune correspondance détectée dans notre base de veille." : "Sources principales :",
      topLeaks,
      "",
      recommendationLine,
      "",
      "Cet email a été généré automatiquement pour la démonstration Team Bravo.",
    ].join("\n");
  }

  async function enableNotifs() {
    if (notifGranted === "unsupported") return;

    const recipientEmail = recipientEmailInput.trim() || user?.email || email || "";
    const subject = isSafe ? "Team Bravo — Aucun risque détecté" : "Team Bravo — Récapitulatif de vos potentielles fuites";
    const body = buildLeakRecap(recipientEmail);

    setIsSendingEmail(true);
    setEmailFeedback(null);
    try {
      await sendAlertEmail({
        to: recipientEmail,
        subject,
        userName: user?.name ?? "utilisateur",
        recipientEmail,
        score,
        breachCount: leakSummary.breachCount,
        exposedCategories: leakSummary.riskCategories.slice(0, 4).map((category) => category.label),
        breaches: leakSummary.breaches.slice(0, 3).map((breach) => ({
          company: breach.company,
          severity: breach.severity,
          details: breach.aiSummary,
        })),
        isSafe,
      });

      setEmailSent(true);
      setEmailFeedback(isSafe ? `Résumé de sécurité envoyé à ${recipientEmail}.` : `Résumé envoyé à ${recipientEmail}.`);

      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          const res = await Notification.requestPermission();
          setNotifGranted(res);

          if (res === "granted") {
            setTimeout(() => {
              new Notification(isSafe ? "🛡️ Team Bravo — sécurité saine" : "🛡️ Team Bravo — alerte critique", {
                body: isSafe
                  ? "Aucune empreinte de fuite connue n’a été détectée pour votre profil. Votre posture de sécurité apparaît actuellement saine."
                  : "Votre récapitulatif a été envoyé à votre adresse email.",
                icon: teamBravo,
                tag: "afterleak-demo",
              });
            }, 1500);
          }
        } else {
          setNotifGranted("unsupported");
        }
      } catch (notifError) {
        console.error("Notification permission error", notifError);
        setNotifGranted("unsupported");
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Échec de l'envoi de l'email.";
      setEmailSent(false);
      setEmailFeedback(`Échec de l'envoi : ${message}`);
    } finally {
      setIsSendingEmail(false);
    }
  }

  const dataPie = leakSummary.riskCategories.map((c) => ({ name: c.label, value: c.count }));
  const dataBar = leakSummary.breaches.map((b) => ({
    name: b.company,
    Critique: b.severity === "critique" ? 100 : 0,
    Élevé: b.severity === "élevé" ? 75 : 0,
    Moyen: b.severity === "moyen" ? 50 : 0,
    Faible: b.severity === "faible" ? 25 : 0,
  }));
  const threatSignals = useMemo(() => {
    if (isSafe) return [];
    return leakSummary.riskCategories.slice(0, 4).map((category, index) => ({
      label: category.label,
      probability: Math.min(95, Math.max(25, 35 + category.count * 12 + index * 8 + (category.severity === "critique" ? 12 : category.severity === "élevé" ? 8 : 0))),
    }));
  }, [isSafe, leakSummary.riskCategories]);
  const attackerSignals = useMemo(() => {
    if (isSafe) return [];
    return leakSummary.breaches.slice(0, 3).map((breach, index) => ({
      label: `${breach.company} · ${breach.severity}`,
      confidence: Math.min(98, 55 + index * 12 + (breach.severity === "critique" ? 12 : breach.severity === "élevé" ? 8 : 4)),
    }));
  }, [isSafe, leakSummary.breaches]);
  const attackVectors = useMemo(() => {
    if (isSafe) return [];
    return Array.from(new Set(leakSummary.breaches.flatMap((breach) => breach.dataTypes.slice(0, 2)))).slice(0, 4);
  }, [isSafe, leakSummary.breaches]);
  const dataRadar = threatSignals.map((signal) => ({ subject: signal.label, A: signal.probability }));
  const dataTrend = useMemo(() => {
    const base = isSafe ? 8 : Math.min(96, score + breachCount * 6);
    return Array.from({ length: 12 }).map((_, i) => ({
      month: ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"][i],
      exposition: isSafe ? 8 : Math.min(100, base + Math.round(Math.sin(i / 1.8) * (score / 12)) + (i % 3 === 0 ? breachCount * 2 : 0)),
    }));
  }, [isSafe, score, breachCount]);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <main className="mx-auto max-w-7xl w-full px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Tableau de bord</div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">Surface d'exposition de <span className="font-mono text-primary">{email}</span></h1>
            <p className="text-muted-foreground mt-2">Analyse mise à jour il y a 2 minutes · {leakSummary.breachCount + telegramSignalCount} signal{leakSummary.breachCount + telegramSignalCount > 1 ? "s" : ""} d’exposition</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2 min-w-[260px]">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <input
                value={recipientEmailInput}
                onChange={(event) => setRecipientEmailInput(event.target.value)}
                type="email"
                className="w-full bg-transparent outline-none text-sm"
                placeholder="destinataire@exemple.com"
              />
            </div>
            <button
              onClick={enableNotifs}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                notifGranted === "granted"
                  ? "bg-success/10 border-success/30 text-success"
                  : "glass hover:border-primary/40"
              }`}
            >
              {notifGranted === "granted" ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              {notifGranted === "granted" ? "Notifications actives" :
               notifGranted === "unsupported" ? "Notifications non supportées" :
               "Activer les alertes mobiles"}
            </button>
            {emailFeedback ? (
              <div className={`text-sm ${emailSent ? "text-success" : "text-destructive"}`}>
                {emailFeedback}
              </div>
            ) : null}
          </div>
        </div>

        <section className="relative overflow-hidden rounded-[34px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(25,122,255,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,255,208,0.1),transparent_38%),linear-gradient(135deg,rgba(4,10,22,0.98),rgba(10,18,34,0.94))] p-8 shadow-[0_35px_130px_-52px_rgba(27,99,255,0.55)]">
          <div className="absolute inset-0 grid-bg opacity-15" />
          <motion.img
            src={teamBravo}
            alt="Team Bravo"
            initial={{ opacity: 0.18, scale: 0.94, rotate: -6 }}
            animate={{ opacity: 0.28, scale: 1.02, rotate: -2, y: [-8, 8, -8] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -right-14 -top-10 h-[28rem] w-[28rem] object-contain mix-blend-screen blur-[1px]"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(16,79,255,0.08))]" />

          <div className="relative grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/45 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_rgba(32,188,255,0.9)]" />
                Team Bravo Insight Deck
              </div>

              <h2 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                {heroHeadline}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                {heroSubcopy}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Fuites confirmées</div>
                  <div className="mt-2 font-display text-3xl font-semibold">{breachCount}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Sources recoupées pour ce profil.</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Risque dominant</div>
                  <div className="mt-2 text-lg font-semibold">{leadRiskCategory?.label ?? "Aucun"}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{leadRiskCategory ? `${leadRiskCategory.count} exposition${leadRiskCategory.count > 1 ? "s" : ""}` : "Signal bas"}</p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-background/45 p-4 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Signal externe</div>
                  <div className="mt-2 font-display text-3xl font-semibold">{telegramSignalCount}</div>
                  <p className="mt-1 text-xs text-muted-foreground">Veille additionnelle détectée.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {highlightedBreaches.map((breach) => (
                  <span key={breach.id} className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary">
                    {breach.company}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-background/50 p-5 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Lecture immédiate</div>
                    <div className="font-display text-xl font-semibold">Verdict terrain</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-foreground/95">
                  {isSafe
                    ? "Aucune fuite exploitable n'apparaît dans la base. Le bon usage ici est la surveillance continue, pas une action forcée artificiellement."
                    : highlightedBreaches.length > 0
                      ? `Les sources qui structurent le plus le profil sont ${highlightedBreaches.map((breach) => breach.company).join(", ")}. Chaque ligne est déjà recoupée avec les types de données réellement exposés.`
                      : "Des signaux d'exposition existent, mais ils demandent surtout une lecture de surface d'attaque et non un faux scénario de remédiation."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-background/42 p-4 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Meilleure action</div>
                  <div className="mt-2 text-base font-semibold">
                    {passwordExposureBreaches.length > 0
                      ? remediationTasks.length > 0
                        ? `Ouvrir ${primaryRemediationTask?.site.name}`
                        : "Préparer une rotation hors pilote"
                      : leadRiskCategory?.action ?? "Maintenir la veille"}
                  </div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {passwordExposureBreaches.length > 0
                      ? "Aucune fausse promesse: l'action n'est proposée que si elle correspond à une fuite ou à une préparation utile."
                      : "Le bloc supérieur ne pousse plus un scénario mot de passe quand le risque réel est ailleurs."}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-background/42 p-4 backdrop-blur-xl">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dernière fuite visible</div>
                  <div className="mt-2 text-base font-semibold">{highlightedBreaches[0]?.company ?? "Aucune"}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{highlightedBreaches[0]?.date ?? "Pas de signal récent pour ce profil."}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-border/60 bg-background/70 p-4 backdrop-blur-xl">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Préparation du verdict</div>
                <div className="mt-2 text-base font-semibold">La lecture des résultats commence après la vérification des sources.</div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Les données sont d’abord validées et comparées, puis les résultats détaillés sont débloqués.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {passwordExposureBreaches.length > 0 && remediationTasks.length > 0 && primaryRemediationTask ? (
                  <button
                    onClick={() => void launchAssistedRotation(primaryRemediationTask)}
                    disabled={!(remediationState[primaryRemediationTask.id] ?? getDefaultRemediationState()).consentGranted}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-55"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir {primaryRemediationTask.site.name}
                  </button>
                ) : null}

                <button
                  onClick={enableNotifs}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/60 px-4 py-3 text-sm font-medium transition hover:border-primary/40"
                >
                  <BellRing className="h-4 w-4 text-primary" />
                  Recevoir le résumé
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-border/60 bg-background/80 p-8 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Contrôle d’intégrité</div>
              <h3 className="mt-3 text-3xl font-semibold leading-tight">Nous avons fait de la vérification un passage obligatoire avant le verdict.</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Avant d’afficher le score ou les recommandations, le tableau vérifie la cohérence des hashes du dataset local, des sources publiques et de la chaîne de validation. Les résultats ne sont révélés qu’une fois cette étape passée.
              </p>
            </div>
            <div className={`rounded-[24px] border px-5 py-4 ${integrityLoading ? "border-warning/30 bg-warning/10 text-warning" : integrityReport?.verification.valid === false || integrityReport?.integrityStatus === "tampered" ? "border-danger/30 bg-danger/10 text-danger" : integrityReport?.integrityStatus === "ok" ? "border-success/30 bg-success/10 text-success" : "border-border/60 bg-background/60 text-muted-foreground"}`}>
              <div className="text-[11px] uppercase tracking-[0.24em]">Statut</div>
              <div className="mt-2 text-xl font-semibold">
                {integrityLoading ? "Vérification en cours" : integrityReport?.verification.valid === false || integrityReport?.integrityStatus === "tampered" ? "Échec de validation" : integrityReport?.integrityStatus === "ok" ? "Validation réussie" : "En attente"}
              </div>
              <p className="mt-2 text-sm leading-6">
                {integrityLoading
                  ? "Comparaison des sources et du chainage des hashes…"
                  : integrityReport?.verification.valid === false || integrityReport?.integrityStatus === "tampered"
                    ? "Une incohérence a été détectée et le verdict est verrouillé jusqu’à correction."
                    : integrityReport?.integrityStatus === "ok"
                      ? "La chaîne est cohérente, les valeurs sont prêtes à être exploitées."
                      : "Le contrôle est lancé automatiquement dès que l’analyse est prête."}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sources contrôlées</div>
              <div className="mt-2 text-2xl font-semibold">{integrityReport?.sourceCount ?? "—"}</div>
              <p className="mt-2 text-sm text-muted-foreground">Dataset local et sources publiques croisées.</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Chaîne de validation</div>
              <div className="mt-2 text-2xl font-semibold">{integrityReport ? `Bloc ${integrityReport.blockIndex}` : "—"}</div>
              <p className="mt-2 text-sm text-muted-foreground">Le hash courant est comparé au précédent.</p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Précision</div>
              <div className="mt-2 text-2xl font-semibold">{integrityLoading ? "…" : integrityReport?.verification.valid ? "Conforme" : integrityReport ? "À corriger" : "À venir"}</div>
              <p className="mt-2 text-sm text-muted-foreground">Le verdict ne s’affiche qu’après validation complète.</p>
            </div>
          </div>
        </section>

        {showResults ? (
          <>
            {/* Risk score */}
        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-1 glass-strong rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30" style={{ background: isSafe ? "linear-gradient(135deg, oklch(0.55 0.16 155 / 0.35), oklch(0.7 0.14 150 / 0.2))" : "var(--gradient-danger)" }} />
            <div className="relative">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Score global d'exposition</div>
              <div className="mt-4 flex items-baseline gap-2">
                <RiskGauge score={score} />
              </div>
              <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${statusToneClass}`}>
                {isSafe ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />} Statut : {statusLabel}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                {isSafe
                  ? "Aucune empreinte de fuite connue n’a été détectée pour votre profil. Votre posture numérique apparaît actuellement saine et sous contrôle."
                  : telegramSignalCount > 0 && breachCount === 0
                    ? "Un signal externe de veille Telegram a été relevé pour ce profil. Nous l’orientons comme une alerte de sécurité sans révéler de contenu sensible."
                    : "Notre base d’exposition confirme plusieurs fuites liées à cette adresse. Action immédiate recommandée."}
              </p>
            </div>
          </div>

          {/* AI Threat Analysis */}
          <div className="md:col-span-2 glass rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="font-display font-semibold">Analyse IA des menaces</div>
                  <div className="text-xs text-muted-foreground">Synthèse générée par AfterLeak Risk Analyst</div>
                </div>
              </div>
              <p className="text-foreground/90 leading-relaxed">
                {isSafe
                  ? "Aucune empreinte de fuite connue n’a été retrouvée pour ce profil. Les signaux de menace restent actuellement vides et votre environnement numérique semble sous contrôle."
                  : telegramSignalCount > 0 && breachCount === 0
                    ? "Un signal externe de canal Telegram a été identifié. Nous l’intégrons comme une alerte de vigilance sans afficher d’éléments compromis."
                    : "Le score est calculé à partir des types de données réellement retrouvés dans la base de fuites. Les probabilités ci-dessous reflètent la gravité observée sur votre profil."}
              </p>
              <div className="mt-6 space-y-3">
                {threatSignals.length ? threatSignals.map((signal) => (
                  <div key={signal.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span>{signal.label}</span>
                      <span className="font-mono text-muted-foreground">{signal.probability}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${signal.probability}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background:
                            signal.probability > 75 ? "linear-gradient(90deg, var(--color-danger), var(--color-critical))" :
                            signal.probability > 50 ? "linear-gradient(90deg, var(--color-warning), var(--color-danger))" :
                            "linear-gradient(90deg, var(--color-success), var(--color-warning))",
                        }}
                      />
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Aucun signal d’exposition n’a été trouvé dans notre base de veille pour ce profil.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Risk cards */}
        <section>
          <SectionHeader title="Résumé des risques" subtitle="Vos données exposées par catégorie" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {leakSummary.riskCategories.map((c, i) => {
              const Icon = ICONS[c.icon] ?? Mail;
              return (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="glass rounded-2xl p-5 hover:border-primary/40 transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-muted/40 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${severityColor(c.severity)}`}>
                      {c.severity}
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold">{c.count}</div>
                  <div className="text-sm font-medium mt-0.5">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.explanation}</div>
                  <div className="mt-3 pt-3 border-t border-border/40 text-xs text-primary/90 flex items-start gap-1.5">
                    <Zap className="w-3 h-3 mt-0.5 shrink-0" /> {c.action}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Charts */}
        <section className="grid lg:grid-cols-3 gap-5">
          <div className="glass rounded-2xl p-6 lg:col-span-3 overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(25,122,255,0.12),transparent_32%),linear-gradient(90deg,rgba(0,255,208,0.05),transparent_40%)]" />
            <div className="relative">
              <SectionHeader title="Veille temps réel" subtitle="Flux animé à partir des fuites réellement corrélées à ce profil" small />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {liveWatchFeed.length ? liveWatchFeed.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: item.delay, duration: 0.45, ease: "easeOut" }}
                    className="rounded-[22px] border border-white/8 bg-background/55 p-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-primary">
                        <motion.span
                          animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.1, 0.9] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          className="h-2 w-2 rounded-full bg-primary"
                        />
                        {item.tag}
                      </div>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.age}</span>
                    </div>
                    <div className="mt-4 font-display text-lg font-semibold">{item.title}</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                  </motion.div>
                )) : (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground lg:col-span-3">
                    Aucun événement corrélé n'est actuellement disponible pour alimenter un flux de veille sur ce profil.
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <SectionHeader title="Types de données exposées" small />
            <div className="h-64">
              {dataPie.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={dataPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3}>
                      {dataPie.map((_, i) => (
                        <Cell key={i} fill={["oklch(0.78 0.18 200)","oklch(0.65 0.22 295)","oklch(0.78 0.18 155)","oklch(0.82 0.17 85)","oklch(0.72 0.21 40)","oklch(0.62 0.25 15)","oklch(0.7 0.15 320)"][i % 7]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  Aucun type de donnée exposé n’a été détecté dans notre base de veille.
                </div>
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <SectionHeader title="Sévérité par fuite" small />
            <div className="h-64">
              {dataBar.length ? (
                <ResponsiveContainer>
                  <BarChart data={dataBar}>
                    <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                    <XAxis dataKey="name" tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="Critique" stackId="a" fill={severityHex("critique")} />
                    <Bar dataKey="Élevé" stackId="a" fill={severityHex("élevé")} />
                    <Bar dataKey="Moyen" stackId="a" fill={severityHex("moyen")} />
                    <Bar dataKey="Faible" stackId="a" fill={severityHex("faible")} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  Aucune fuite n’a été détectée, donc aucun graphique de sévérité n’est à afficher.
                </div>
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-6">
            <SectionHeader title="Surface d'attaque" small />
            <div className="h-64">
              {dataRadar.length ? (
                <ResponsiveContainer>
                  <RadarChart data={dataRadar}>
                    <PolarGrid stroke="oklch(1 0 0 / 0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.78 0.03 260)", fontSize: 10 }} />
                    <Radar dataKey="A" stroke="oklch(0.78 0.18 200)" fill="oklch(0.78 0.18 200)" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                  La surface d’attaque reste vide tant qu’aucune fuite n’est détectée.
                </div>
              )}
            </div>
          </div>
          <div className="glass rounded-2xl p-6 lg:col-span-3">
            <SectionHeader title="Évolution de votre exposition (12 mois)" small />
            <div className="h-56">
              {isSafe ? (
                <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-success/30 bg-success/8 p-6 text-center">
                  <div className="text-sm font-semibold text-success">Aucune nouvelle exposition observée</div>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Le profil reste propre et aucune fuite récente n’a été détectée. Le suivi continue en arrière-plan, mais il n’y a pas d’évolution à afficher pour le moment.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer>
                  <AreaChart data={dataTrend}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="oklch(0.78 0.18 200)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(1 0 0 / 0.05)" />
                    <XAxis dataKey="month" tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "oklch(0.68 0.03 260)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "oklch(0.18 0.03 260)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 12, fontSize: 12 }} />
                    <Area dataKey="exposition" stroke="oklch(0.78 0.18 200)" fill="url(#grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        {/* Attacker profile - flagship */}
        <section className={`rounded-3xl p-8 relative overflow-hidden ${isSafe ? "bg-success/10 border border-success/20" : "glass-strong"}`}>
          <div className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl ${isSafe ? "bg-success/20" : "bg-critical/20"}`} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isSafe ? "bg-success/15 border-success/30" : "bg-critical/15 border-critical/30"}`}>
                {isSafe ? <ShieldCheck className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-critical" />}
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold">{isSafe ? "État de sécurité actuel" : "Ce qu’un attaquant pourrait apprendre"}</h2>
                <p className="text-sm text-muted-foreground">{isSafe ? "Aucune empreinte de fuite connue n’a été retrouvée pour votre profil à ce jour." : "Profil reconstitué à partir des éléments réellement exposés dans notre base de veille."}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mt-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Informations connues</div>
                {attackerSignals.length ? (
                  <ul className="space-y-2.5">
                    {attackerSignals.map((signal) => (
                      <li key={signal.label} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-success" />
                          <span className="text-sm">{signal.label}</span>
                        </div>
                        <div className="flex items-center gap-2 w-32">
                          <div className="flex-1 h-1 rounded-full bg-muted/40">
                            <div className="h-full rounded-full bg-gradient-to-r from-warning to-critical" style={{ width: `${signal.confidence}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground font-mono w-9 text-right">{signal.confidence}%</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Aucun élément exposé n’a été trouvé pour ce profil.
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Attaques probables</div>
                {attackVectors.length ? (
                  <div className="grid grid-cols-2 gap-3">
                    {attackVectors.map((attack, i) => (
                      <motion.div
                        key={attack}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-3 rounded-xl glass text-sm flex items-center gap-2 ${isSafe ? "border-success/20" : "border-critical/20"}`}
                      >
                        <Zap className={`w-3.5 h-3.5 shrink-0 ${isSafe ? "text-success" : "text-critical"}`} />
                        {attack}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                    Le profil semble actuellement sain, sans vecteur d’attaque observé dans notre base de veille.
                  </div>
                )}

                <div className={`mt-6 p-4 rounded-xl border ${isSafe ? "bg-success/10 border-success/20" : "bg-critical/10 border-critical/20"}`}>
                  <div className={`text-xs uppercase tracking-widest font-semibold mb-1 ${isSafe ? "text-success" : "text-critical"}`}>Verdict IA</div>
                  <p className="text-sm text-foreground/90">
                    {isSafe
                      ? "Aucune exposition vérifiée n’a été détectée pour ce profil. La posture de sécurité reste actuellement saine."
                      : `Profil potentiellement exposé via ${leakSummary.breaches.slice(0, 2).map((breach) => breach.company).join(" et ")}.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {leakJourney && (
          <section>
            <SectionHeader title="Analyse OSINT de la fuite" subtitle="Une lecture narrative de la propagation observée" />
            <div className="overflow-hidden rounded-[30px] border border-border/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/70 px-4 py-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Flux d’exposition</div>
                  <div className="font-display text-base font-semibold text-foreground">Propagation observée entre sources et relais</div>
                </div>
                <div className="rounded-full border border-danger/25 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                  Sensibilité élevée
                </div>
              </div>

              <div className="relative ml-2 pl-8">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-danger/70 to-primary/40" />
                {leakJourney.map((step, index) => (
                  <motion.div
                    key={`${step.title}-${index}`}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="relative mb-4 last:mb-0"
                  >
                    <div className="absolute -left-[25px] top-4 h-3.5 w-3.5 rounded-full border-2 border-background bg-danger shadow-[0_0_0_6px_rgba(255,87,87,0.16)]" />
                    <div className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{step.title}</div>
                        <div className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-primary">
                          {index === 0 ? "Début" : index === 1 ? "Réorientation" : "Impact"}
                        </div>
                      </div>
                      <div className="mt-2 font-display text-base font-semibold text-foreground">{step.label}</div>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {!isSafe && (
          <section className="glass rounded-3xl p-6">
            <SectionHeader title="Lecture stratégique de l’agent" subtitle="Recommandations IA reformattées pour une vraie prise de décision" small />
            {assistantLoading ? (
              <div className="text-sm text-muted-foreground">Analyse en cours…</div>
            ) : assistantAdvice ? (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-critical/20 bg-[linear-gradient(180deg,rgba(85,18,18,0.22),rgba(17,19,30,0.62))] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-critical/12 p-3 text-critical"><ShieldAlert className="h-5 w-5" /></div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Conclusion opératoire</div>
                        <div className="font-display text-lg font-semibold">Action immédiate</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-foreground/95">{assistantAdvice.conclusion}</p>
                  </div>

                  <div className="rounded-[24px] border border-primary/20 bg-[linear-gradient(180deg,rgba(16,59,105,0.22),rgba(17,19,30,0.62))] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-primary/12 p-3 text-primary"><KeyRound className="h-5 w-5" /></div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Règle de rotation</div>
                        <div className="font-display text-lg font-semibold">Mot de passe cible</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-foreground/95">{assistantAdvice.passwordAdvice}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-border/60 bg-background/70 p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-accent/12 p-3 text-accent"><Activity className="h-5 w-5" /></div>
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Résistance estimée</div>
                        <div className="font-display text-lg font-semibold">Temps de cassage</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-foreground/95">{assistantAdvice.crackTimeEstimate}</p>
                  </div>

                  <div className="rounded-[24px] border border-border/60 bg-background/70 p-5">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Renforcement complémentaire</div>
                    <div className="mt-3 grid gap-3">
                      {assistantAdvice.strengthTips.map((tip, index) => {
                        const icons = [ShieldCheck, Smartphone, Lock];
                        const TipIcon = icons[index] ?? Check;
                        return (
                          <div key={tip} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/65 p-3">
                            <div className="rounded-2xl bg-primary/10 p-2 text-primary"><TipIcon className="h-4 w-4" /></div>
                            <span className="text-sm leading-6 text-foreground/95">{tip}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aucune réponse IA n’a pu être générée pour le moment.</div>
            )}
          </section>
        )}

        <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="glass rounded-3xl p-6">
            <SectionHeader title="Test de robustesse du mot de passe" subtitle="Estimez sa cassabilité et les actions à mener" small />
            <div className="mt-4 space-y-3">
              <label className="text-sm text-muted-foreground" htmlFor="password-strength">Saisissez un mot de passe à évaluer</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="password-strength"
                  value={passwordStrengthInput}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setPasswordStrengthInput(nextValue);
                    if (!nextValue.trim()) {
                      setPasswordStrengthResult(null);
                      return;
                    }
                    setPasswordStrengthResult({
                      conclusion: "Évaluation locale en temps réel",
                      passwordAdvice: evaluatePasswordStrength(nextValue).passwordAdvice,
                      crackTimeEstimate: evaluatePasswordStrength(nextValue).crackTimeEstimate,
                      passwordStrength: evaluatePasswordStrength(nextValue).label,
                      strengthScore: evaluatePasswordStrength(nextValue).score,
                      strengthLabel: evaluatePasswordStrength(nextValue).label,
                      strengthTips: evaluatePasswordStrength(nextValue).strengthTips,
                      nextSteps: evaluatePasswordStrength(nextValue).nextSteps,
                    });
                  }}
                  placeholder="Ex. MotDePasse!2026"
                  className="flex-1 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none ring-0"
                />
                <button
                  onClick={() => void runPasswordStrengthCheck()}
                  disabled={passwordStrengthLoading || !passwordStrengthInput.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-55"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {passwordStrengthLoading ? "Analyse…" : "Évaluer"}
                </button>
              </div>
              {passwordStrengthResult ? (
                <div className="rounded-[24px] border border-primary/20 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Résultat</div>
                      <div className="mt-1 font-display text-lg font-semibold">{passwordStrengthResult.passwordStrength ?? passwordStrengthResult.strengthLabel ?? "Évaluation"}</div>
                    </div>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{passwordStrengthResult.strengthScore ?? 0}/100</div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{passwordStrengthResult.crackTimeEstimate}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/95">{passwordStrengthResult.passwordAdvice}</p>
                  <div className={`mt-3 rounded-2xl border border-border/50 bg-background/60 p-3 text-sm ${passwordRecommendationSummary.tone}`}>
                    <div className="font-medium">{passwordRecommendationSummary.title}</div>
                    <p className="mt-1 leading-6">{passwordRecommendationSummary.description}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {passwordStrengthResult.strengthTips.slice(0, 3).map((tip) => (
                      <span key={tip} className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">{tip}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <SectionHeader title="Assistant de sécurité" subtitle="Posez une question rapide à l’IA de secours" small />
            <div className="mt-4 space-y-3">
              <div className="space-y-2 rounded-[24px] border border-border/50 bg-background/60 p-3">
                {chatMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60 text-foreground"}`}>
                      {message.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendChatMessage();
                    }
                  }}
                  placeholder="Par exemple : comment réagir à une fuite ?"
                  className="flex-1 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm outline-none ring-0"
                />
                <button
                  onClick={() => void sendChatMessage()}
                  disabled={chatLoading || !chatInput.trim()}
                  className="inline-flex items-center justify-center rounded-2xl bg-primary p-3 text-primary-foreground transition hover:opacity-90 disabled:opacity-55"
                  aria-label="Envoyer"
                >
                  {chatLoading ? <Activity className="h-4 w-4" /> : <SendHorizonal className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations + Notifications */}
        <section className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 glass rounded-2xl p-6">
            <SectionHeader title="Plan d'action contextualisé" subtitle="Construit à partir des fuites réellement visibles pour ce profil" small />
            <div className="grid gap-4">
              {recommendationItems.map((item) => {
                const checked = done[item.id];
                const Icon = item.icon;
                const tone = item.priority === "Critique" ? "text-critical bg-critical/15 border-critical/30" :
                             item.priority === "Élevée" ? "text-danger bg-danger/15 border-danger/30" :
                             item.priority === "Moyenne" ? "text-warning bg-warning/15 border-warning/30" :
                             "text-success bg-success/15 border-success/30";
                return (
                  <div key={item.id} className="rounded-[24px] border border-border/50 bg-background/55 p-4">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => setDone((d) => ({ ...d, [item.id]: !d[item.id] }))}
                        className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition ${checked ? "border-success bg-success/15 text-success" : "border-border bg-background/80 text-primary hover:border-primary/40"}`}
                        aria-label="Marquer comme fait"
                      >
                        {checked ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wider ${tone}`}>{item.priority}</span>
                          <span className={`font-medium ${checked ? "line-through text-muted-foreground" : ""}`}>{item.title}</span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                        {item.actionLabel ? (
                          <button
                            onClick={() => primaryRemediationTask ? void launchAssistedRotation(primaryRemediationTask) : undefined}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition hover:border-primary/50"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {item.actionLabel}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <div className="font-display font-semibold">Centre de diffusion réel</div>
              </div>
              <p className="text-sm text-muted-foreground">Seuls les canaux réellement branchés à ce projet apparaissent ici. Plus de Slack ou Telegram fantômes.</p>

              <div className="mt-4 space-y-2">
                {availableNotificationChannels.map((c) => (
                  <div key={c.name} className="rounded-lg bg-muted/30 px-3 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.on ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                        {c.on ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.detail}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={enableNotifs}
                disabled={notifGranted === "unsupported"}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium text-sm disabled:opacity-50"
              >
                <BellRing className="w-4 h-4" />
                {isSendingEmail ? "Envoi en cours..." : emailSent ? "Résumé envoyé par email" : notifGranted === "granted" ? "Envoyer email + push" : "Activer le push puis envoyer"}
              </button>
              <p className="text-[11px] text-muted-foreground mt-2 text-center flex items-center gap-1 justify-center">
                <Lock className="w-3 h-3" /> Canaux implémentés : email transactionnel et notification locale navigateur
              </p>
            </div>
          </div>
        </section>

          </>
        ) : (
          <section className="rounded-[34px] border border-dashed border-danger/30 bg-danger/10 p-8 text-center">
            <div className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Résultats verrouillés</div>
            <h3 className="mt-3 text-2xl font-semibold">Le verdict détaillé apparaît après la validation d’intégrité.</h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Nous ne révélons pas le score final avant d’avoir validé la cohérence des sources et des hashes.
            </p>
          </section>
        )}

        {/* Coming soon AI */}
        <section className="glass rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs uppercase tracking-widest text-accent font-medium">Bientôt disponible</span>
            </div>
            <h3 className="font-display text-2xl font-bold">Modules IA premium</h3>
            <p className="text-muted-foreground mt-1">Une intelligence cyber sur-mesure, augmentée par nos modèles de langage spécialisés.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
              {["Analyste IA des risques","Simulation d'attaque IA","Conseiller sécurité personnalisé","Générateur de rapport menace","Synthèse exécutive"].map((t) => (
                <div key={t} className="p-4 rounded-xl bg-muted/30 border border-border/40 text-sm">
                  <Sparkles className="w-4 h-4 text-accent mb-2" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="text-center pt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Retour à l'accueil</Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({ title, subtitle, small }: { title: string; subtitle?: string; small?: boolean }) {
  return (
    <div className="mb-4">
      <h2 className={`font-display font-semibold ${small ? "text-base" : "text-2xl"}`}>{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function RiskGauge({ score }: { score: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 40 || score > 0 ? "oklch(0.74 0.24 18)" : "oklch(0.78 0.18 155)";
  return (
    <div className="relative w-40 h-40">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle cx="70" cy="70" r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth="10" fill="none" />
        <motion.circle
          cx="70" cy="70" r={r} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-bold">{score}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}
