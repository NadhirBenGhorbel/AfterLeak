type BreachLike = {
  id: string;
  company: string;
  date: string;
  severity: "faible" | "moyen" | "élevé" | "critique";
  exposedFields: string[];
  dataTypes: string[];
};

export type SupportedRemediationSite = {
  id: string;
  name: string;
  aliases: string[];
  launchUrl: string;
  securityUrlLabel: string;
  automationLevel: "assisted";
  providerTone: string;
  consentCopy: string;
  steps: string[];
  successSignals: string[];
};

export type RemediationTask = {
  id: string;
  breachId: string;
  site: SupportedRemediationSite;
  title: string;
  summary: string;
  severity: BreachLike["severity"];
  breachDate: string;
  exposedData: string[];
};

const SUPPORTED_SITES: SupportedRemediationSite[] = [
  {
    id: "dailymotion",
    name: "Dailymotion",
    aliases: ["dailymotion"],
    launchUrl: "https://www.dailymotion.com/account/settings/security",
    securityUrlLabel: "Paramètres de sécurité Dailymotion",
    automationLevel: "assisted",
    providerTone: "Plateforme vidéo",
    consentCopy: "Team Bravo ouvrira les paramètres de sécurité Dailymotion dans un nouvel onglet et préparera la rotation assistée du mot de passe. L'utilisateur garde la main sur la connexion, la 2FA et la validation finale.",
    steps: [
      "Ouvrir les paramètres de sécurité Dailymotion.",
      "Laisser l'utilisateur s'authentifier et confirmer les contrôles secondaires éventuels.",
      "Appliquer le mot de passe généré dans la section de renouvellement puis valider la mise à jour.",
    ],
    successSignals: [
      "Dailymotion confirme que le mot de passe a été modifié.",
      "Les anciennes sessions ou appareils demandent une reconnexion.",
    ],
  },
  {
    id: "leetchi",
    name: "Leetchi",
    aliases: ["leetchi"],
    launchUrl: "https://www.leetchi.com/app/profile",
    securityUrlLabel: "Compte Leetchi",
    automationLevel: "assisted",
    providerTone: "Plateforme de cagnotte",
    consentCopy: "Team Bravo ouvrira l'espace de compte Leetchi pour accélérer la rotation du mot de passe. L'utilisateur reste responsable de l'authentification et de toute vérification demandée par la plateforme.",
    steps: [
      "Ouvrir la zone de compte Leetchi.",
      "Laisser l'utilisateur vérifier sa session avant d'entrer dans les paramètres de sécurité.",
      "Appliquer le mot de passe généré puis valider la rotation.",
    ],
    successSignals: [
      "Leetchi confirme la mise à jour du mot de passe.",
      "Les anciennes sessions sont réinitialisées ou redemandent une reconnexion.",
    ],
  },
  {
    id: "nocibe",
    name: "Nocibe",
    aliases: ["nocibe", "nocibé"],
    launchUrl: "https://www.nocibe.fr/login",
    securityUrlLabel: "Connexion Nocibe",
    automationLevel: "assisted",
    providerTone: "E-commerce retail",
    consentCopy: "Team Bravo ouvrira l'espace de connexion Nocibe et préparera la mise à jour du mot de passe. L'utilisateur garde la main sur le formulaire, la vérification d'identité et la confirmation finale.",
    steps: [
      "Ouvrir la page de connexion Nocibe.",
      "Laisser l'utilisateur ouvrir la zone de compte ou la récupération sécurisée si nécessaire.",
      "Appliquer le mot de passe généré et confirmer la sortie des autres sessions si l'option est disponible.",
    ],
    successSignals: [
      "Le compte Nocibe confirme la rotation du mot de passe.",
      "Une ancienne session ne reste pas active sans reconnexion.",
    ],
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    aliases: ["crunchyroll"],
    launchUrl: "https://www.crunchyroll.com/account/settings",
    securityUrlLabel: "Paramètres du compte Crunchyroll",
    automationLevel: "assisted",
    providerTone: "Plateforme streaming",
    consentCopy: "Team Bravo ouvrira l'espace de paramètres Crunchyroll pour accélérer le changement du mot de passe. L'utilisateur reste responsable de l'authentification et de toute vérification secondaire demandée par la plateforme.",
    steps: [
      "Ouvrir les paramètres du compte Crunchyroll.",
      "Vérifier que la session appartient bien à l'utilisateur avant d'ouvrir la section mot de passe.",
      "Appliquer le mot de passe généré puis confirmer la déconnexion des autres appareils si l'option est proposée.",
    ],
    successSignals: [
      "Le tableau de bord confirme la mise à jour du mot de passe.",
      "Les autres appareils demandent une reconnexion.",
    ],
  },
];

function normalizeSiteName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getSupportedRemediationSite(company: string): SupportedRemediationSite | null {
  const normalizedCompany = normalizeSiteName(company);
  return SUPPORTED_SITES.find((site) =>
    site.aliases.some((alias) => normalizedCompany.includes(normalizeSiteName(alias))),
  ) ?? null;
}

export function buildRemediationTasks(breaches: BreachLike[]): RemediationTask[] {
  return breaches
    .filter((breach) => breach.exposedFields.includes("mot_de_passe"))
    .map((breach) => {
      const site = getSupportedRemediationSite(breach.company);
      if (!site) return null;

      return {
        id: `${site.id}-${breach.id}`,
        breachId: breach.id,
        site,
        title: `Rotation assistée ${site.name}`,
        summary: `Mot de passe exposé sur ${site.name}. AfterLeak peut lancer une session assistée sur ${site.securityUrlLabel.toLowerCase()}.`,
        severity: breach.severity,
        breachDate: breach.date,
        exposedData: breach.dataTypes,
      } satisfies RemediationTask;
    })
    .filter((task): task is RemediationTask => Boolean(task));
}

export function getUnsupportedPasswordSites(breaches: BreachLike[]): string[] {
  return breaches
    .filter((breach) => breach.exposedFields.includes("mot_de_passe"))
    .filter((breach) => !getSupportedRemediationSite(breach.company))
    .map((breach) => breach.company);
}

export function getSupportedRemediationSites(): SupportedRemediationSite[] {
  return SUPPORTED_SITES;
}