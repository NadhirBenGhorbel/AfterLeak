import datasetBaseCsv from "../dataset_base_outil.csv?raw";

export interface DatasetLeakRecord {
  siteStructure: string;
  dataTypes: string[];
  email: string;
  phone: string;
  leakDate: string;
  exposedFields: string[];
}

export interface DatasetLeakSummary {
  matchFound: boolean;
  score: number;
  breachCount: number;
  telegramSignalCount: number;
  breaches: Array<{
    id: string;
    company: string;
    logo: string;
    industry: string;
    date: string;
    affected: number;
    severity: "faible" | "moyen" | "élevé" | "critique";
    dataTypes: string[];
    exposedFields: string[];
    attackVector: string;
    attackType: string;
    threatActor: string;
    stillCirculating: boolean;
    publicReport: string;
    aiSummary: string;
  }>;
  riskCategories: Array<{
    key: string;
    label: string;
    count: number;
    severity: "faible" | "moyen" | "élevé" | "critique";
    explanation: string;
    action: string;
    icon: string;
  }>;
}

const TELEGRAM_SIGNAL_HINTS = [
  { emails: ["alexis-guérin37@live.fr", "alexis.garnier@orange.fr"], count: 1 },
  { emails: ["alexis.laurent@gmail.com"], count: 1 },
  { emails: ["alexis.michel45@yahoo.fr"], count: 1 },
] as const;

const DATASET_FIELDS = [
  "adresse",
  "données_médicales",
  "données_bancaires",
  "téléphone",
  "email",
  "identité",
  "mot_de_passe",
  "numéro_sécu",
  "CV",
  "revenus",
  "historique_achats",
  "IBAN",
  "numéro_contrat",
  "données_fiscales",
  "permis_conduire",
  "données_localisation",
] as const;

type SeverityLevel = "faible" | "moyen" | "élevé" | "critique";

type DataTypeDefinition = {
  id: string;
  label: string;
  baseSeverity: number;
  revocable: boolean;
  actionType: "remediation" | "vigilance";
  threats: string[];
  actions: Array<{ priority: "critical" | "high" | "medium" | "low"; text: string }>;
};

const DATA_TYPE_DEFINITIONS: Record<string, DataTypeDefinition> = {
  mot_de_passe: {
    id: "password",
    label: "Mot de passe",
    baseSeverity: 8,
    revocable: true,
    actionType: "remediation",
    threats: ["credential_stuffing", "password_spraying"],
    actions: [
      { priority: "critical", text: "Changer le mot de passe du compte concerné immédiatement." },
      { priority: "critical", text: "Changer ce mot de passe sur tout autre compte où il était réutilisé." },
      { priority: "high", text: "Activer la 2FA avec TOTP ou clé physique." },
      { priority: "high", text: "Adopter un gestionnaire de mots de passe." },
      { priority: "medium", text: "Déconnecter les sessions et appareils inconnus." },
    ],
  },
  email: {
    id: "email",
    label: "Adresse email",
    baseSeverity: 5,
    revocable: true,
    actionType: "remediation",
    threats: ["phishing_cible", "account_recovery"],
    actions: [
      { priority: "critical", text: "Sécuriser l'email avec un mot de passe unique et une 2FA forte." },
      { priority: "high", text: "Vérifier les règles de transfert ou filtres ajoutés sans consentement." },
      { priority: "medium", text: "Traiter tout mail de réinitialisation non sollicité comme une alerte d'attaque." },
    ],
  },
  téléphone: {
    id: "phone",
    label: "Numéro de téléphone",
    baseSeverity: 6,
    revocable: true,
    actionType: "remediation",
    threats: ["sim_swap", "smishing"],
    actions: [
      { priority: "critical", text: "Demander un verrouillage de portabilité et un code PIN anti-SIM-swap à l'opérateur." },
      { priority: "high", text: "Remplacer la 2FA SMS par TOTP ou clé physique." },
      { priority: "medium", text: "Surveiller toute perte soudaine de réseau et contacter immédiatement l'opérateur." },
    ],
  },
  identité: {
    id: "name",
    label: "Nom complet",
    baseSeverity: 3,
    revocable: false,
    actionType: "vigilance",
    threats: ["ingénierie_sociale", "phishing_personnalise"],
    actions: [
      { priority: "medium", text: "Considérer toute sollicitation nominative non sollicitée comme potentiellement malveillante." },
      { priority: "medium", text: "Limiter l'exposition publique du nom sur les réseaux sociaux." },
    ],
  },
  adresse: {
    id: "address",
    label: "Adresse postale",
    baseSeverity: 4,
    revocable: true,
    actionType: "vigilance",
    threats: ["usurpation_administrative", "livraison_frauduleuse"],
    actions: [
      { priority: "high", text: "Surveiller le courrier et signaler toute réexpédition ou interruption suspecte." },
      { priority: "medium", text: "Se méfier des courriers administratifs ou bancaires inattendus à cette adresse." },
    ],
  },
  données_bancaires: {
    id: "bank_card",
    label: "Numéro de carte bancaire",
    baseSeverity: 8,
    revocable: true,
    actionType: "remediation",
    threats: ["fraude_cnp", "carding"],
    actions: [
      { priority: "critical", text: "Faire opposition à la carte et demander une nouvelle carte." },
      { priority: "critical", text: "Vérifier les transactions récentes et contester les débits frauduleux." },
      { priority: "high", text: "Activer les notifications de paiement en temps réel." },
    ],
  },
  IBAN: {
    id: "iban",
    label: "IBAN / coordonnées bancaires",
    baseSeverity: 6,
    revocable: true,
    actionType: "remediation",
    threats: ["prelevement_sepa", "virement_frauduleux"],
    actions: [
      { priority: "high", text: "Surveiller les prélèvements et contester tout mouvement non autorisé." },
      { priority: "medium", text: "Ne jamais valider un changement d'IBAN reçu par email sans vérification directe." },
    ],
  },
  données_médicales: {
    id: "medical",
    label: "Données médicales",
    baseSeverity: 7,
    revocable: false,
    actionType: "vigilance",
    threats: ["chantage", "fraude_assurance"],
    actions: [
      { priority: "high", text: "Signaler la fuite à la CNIL et à l'organisme concerné." },
      { priority: "high", text: "Vérifier tout contact se prévalant d'informations médicales précises." },
      { priority: "medium", text: "Conserver une trace des preuves pour un éventuel recours." },
    ],
  },
  numéro_sécu: {
    id: "national_id",
    label: "Numéro de sécurité sociale",
    baseSeverity: 8,
    revocable: false,
    actionType: "vigilance",
    threats: ["usurpation_administrative", "fraude_prestations"],
    actions: [
      { priority: "high", text: "Signaler la fuite à l'organisme concerné et à la CNIL." },
      { priority: "high", text: "Surveiller les relevés de prestations et courrier administratif inhabituel." },
    ],
  },
  permis_conduire: {
    id: "id_document",
    label: "Pièce d'identité",
    baseSeverity: 9,
    revocable: true,
    actionType: "remediation",
    threats: ["kyc_frauduleux", "usurpation_identite"],
    actions: [
      { priority: "critical", text: "Déposer plainte et conserver une trace de la fuite pour contester les actes futurs." },
      { priority: "high", text: "Surveiller les services de crédit et les établissements bancaires." },
      { priority: "high", text: "Signaler le document compromis aux autorités et envisager un renouvellement." },
    ],
  },
  données_localisation: {
    id: "location",
    label: "Géolocalisation",
    baseSeverity: 5,
    revocable: false,
    actionType: "vigilance",
    threats: ["stalking", "cambriolage_cible"],
    actions: [
      { priority: "high", text: "Révoquer les autorisations de localisation des applications non essentielles." },
      { priority: "medium", text: "Désactiver le partage de position et l'historique des trajets." },
    ],
  },
};

const CATEGORY_DEFINITIONS: Record<string, { label: string; icon: string; severity: SeverityLevel; explanation: string; action: string }> = {
  adresse: {
    label: "Adresse",
    icon: "Home",
    severity: "moyen",
    explanation: "Adresse physique ou données de localisation exposées.",
    action: "Vérifiez vos paramètres de confidentialité et les livraisons postales.",
  },
  données_médicales: {
    label: "Données médicales",
    icon: "ShieldCheck",
    severity: "critique",
    explanation: "Informations sensibles liées à votre santé ou à vos soins.",
    action: "Sécurisez immédiatement ces données sensibles et consultez votre médecin si nécessaire.",
  },
  données_bancaires: {
    label: "Données bancaires",
    icon: "CreditCard",
    severity: "critique",
    explanation: "Données de paiement ou d'identification bancaire visibles.",
    action: "Surveillez vos opérations et faites opposition si nécessaire.",
  },
  téléphone: {
    label: "Téléphone",
    icon: "Phone",
    severity: "élevé",
    explanation: "Numéro de téléphone exposé, utile pour l'usurpation d'identité.",
    action: "Protégez votre numéro avec une authentification renforcée.",
  },
  email: {
    label: "Email",
    icon: "Mail",
    severity: "élevé",
    explanation: "Adresse email retrouvée dans des fuites réutilisables pour le phishing.",
    action: "Renforcez votre boîte mail avec un filtre anti-hameçonnage.",
  },
  identité: {
    label: "Identité",
    icon: "AtSign",
    severity: "élevé",
    explanation: "Éléments permettant de reconstituer votre identité personnelle.",
    action: "Contrôlez les identifiants publics et les profils en ligne.",
  },
  mot_de_passe: {
    label: "Mots de passe",
    icon: "KeyRound",
    severity: "critique",
    explanation: "Identifiants de connexion directement compromis.",
    action: "Changez immédiatement les mots de passe concernés et activez la 2FA.",
  },
  numéro_sécu: {
    label: "Numéro de sécurité sociale",
    icon: "ShieldCheck",
    severity: "critique",
    explanation: "Numéro d'assurance sociale exposé, très sensible pour les usurpations.",
    action: "Contactez les organismes concernés et verrouillez l'accès.",
  },
  CV: {
    label: "CV / parcours",
    icon: "Globe",
    severity: "moyen",
    explanation: "Informations professionnelles et parcours exposés.",
    action: "Réduisez la visibilité de vos profils professionnels.",
  },
  revenus: {
    label: "Revenus",
    icon: "Globe",
    severity: "élevé",
    explanation: "Données de revenus révélées, utiles pour les arnaques financières.",
    action: "Surveillez vos démarches bancaires et fiscales.",
  },
  historique_achats: {
    label: "Historique d'achats",
    icon: "CreditCard",
    severity: "moyen",
    explanation: "Habitudes de consommation et transactions exposées.",
    action: "Vérifiez les transactions inhabituelles et contrôlez vos comptes.",
  },
  IBAN: {
    label: "IBAN",
    icon: "CreditCard",
    severity: "critique",
    explanation: "Coordonnées bancaires internationales exposées.",
    action: "Surveillez vos mouvements et faites opposition en cas de doute.",
  },
  numéro_contrat: {
    label: "Numéro de contrat",
    icon: "ShieldCheck",
    severity: "moyen",
    explanation: "Numéro de contrat ou identifiant de service exposé.",
    action: "Vérifiez les accès associés à ce contrat.",
  },
  données_fiscales: {
    label: "Données fiscales",
    icon: "Globe",
    severity: "critique",
    explanation: "Informations fiscales sensibles exposées.",
    action: "Sécurisez vos documents fiscaux et vérifiez les déclarations.",
  },
  permis_conduire: {
    label: "Permis de conduire",
    icon: "Home",
    severity: "critique",
    explanation: "Document d'identité officiel exposé.",
    action: "Protégez votre identité et signalez toute utilisation suspecte.",
  },
  données_localisation: {
    label: "Données de localisation",
    icon: "Home",
    severity: "élevé",
    explanation: "Adresse ou position géographique exposées.",
    action: "Réduisez la géolocalisation partagée publiquement.",
  },
};

function parseCsvLine(line: string): string[] {
  return line.split(",").map((value) => value.trim());
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getTelegramSignalCount(targetEmail: string): number {
  const normalizedTarget = normalizeEmail(targetEmail);
  if (!normalizedTarget) return 0;

  return TELEGRAM_SIGNAL_HINTS.some(({ emails }) => emails.some((email) => normalizeEmail(email) === normalizedTarget)) ? 1 : 0;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatDate(value: string): string {
  if (!value) return "Date inconnue";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function calculateExposureScore(exposedFields: string[]): number {
  const uniqueFields = Array.from(new Set(exposedFields));
  const severities = uniqueFields
    .map((field) => DATA_TYPE_DEFINITIONS[field]?.baseSeverity ?? 0)
    .filter((severity) => severity > 0)
    .sort((a, b) => b - a);

  if (!severities.length) {
    return 0;
  }

  const maxSeverity = severities[0];
  const weightedDescendingSum = severities.slice(1).reduce((sum, severity, index) => sum + severity / 2 ** (index + 1), 0);
  let score = maxSeverity + 0.5 * weightedDescendingSum;

  const hasPassword = uniqueFields.includes("mot_de_passe");
  const hasEmail = uniqueFields.includes("email");
  const hasPhone = uniqueFields.includes("téléphone");
  const hasIdentity = uniqueFields.includes("identité");
  const hasAddress = uniqueFields.includes("adresse");
  const hasNationalId = uniqueFields.includes("numéro_sécu");
  const hasIdDocument = uniqueFields.includes("permis_conduire");
  const hasMedical = uniqueFields.includes("données_médicales");
  const hasBankData = uniqueFields.includes("données_bancaires");
  const hasIban = uniqueFields.includes("IBAN");

  if (hasPassword && hasEmail) {
    score = Math.max(score, 9);
  }

  if (hasPassword && hasEmail && hasPhone) {
    score = 10;
  }

  if (hasIdentity && hasAddress) {
    score = Math.min(10, score + 3);
  }

  if ((hasBankData || hasIban) && hasIdentity) {
    score = Math.min(10, score + 2);
  }

  if (hasNationalId && hasIdentity) {
    score = Math.max(score, 9);
  }

  if (hasMedical && hasIdentity) {
    score = Math.min(10, score + 2);
  }

  if (hasIdDocument && hasAddress) {
    score = 10;
  }

  if (severities.every((severity) => severity <= 3)) {
    score = Math.min(score, 4);
  }

  if (severities.some((severity) => severity >= 8)) {
    score = Math.max(score, 7);
  }

  return Math.min(10, Math.round(score));
}

function getSeverityFromRecord(record: DatasetLeakRecord): SeverityLevel {
  const score = calculateExposureScore(record.exposedFields);
  if (score >= 9) return "critique";
  if (score >= 7) return "élevé";
  if (score >= 4) return "moyen";
  return "faible";
}

function getDatasetRecords(): DatasetLeakRecord[] {
  const lines = datasetBaseCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));

    const exposedFields = DATASET_FIELDS.filter((field) => row[field] === "1");

    return {
      siteStructure: row.site_structure ?? "Source inconnue",
      dataTypes: (row.types_donnees_fuitees ?? "")
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
      email: row.EmailUtilisateur ?? "",
      phone: row.telephone ?? "",
      leakDate: row.date_fuite ?? "",
      exposedFields,
    };
  });
}

export function getLeakDatasetSummary(targetEmail: string): DatasetLeakSummary {
  const normalizedTarget = normalizeEmail(targetEmail);
  const records = getDatasetRecords().filter((record) => normalizeEmail(record.email) === normalizedTarget);

  const telegramSignalCount = getTelegramSignalCount(normalizedTarget);

  if (!records.length) {
    return {
      matchFound: telegramSignalCount > 0,
      score: 0,
      breachCount: 0,
      telegramSignalCount,
      breaches: [],
      riskCategories: Object.entries(CATEGORY_DEFINITIONS).map(([key, definition]) => ({
        key,
        label: definition.label,
        count: 0,
        severity: definition.severity,
        explanation: definition.explanation,
        action: definition.action,
        icon: definition.icon,
      })),
    };
  }

  const categoryCounts = Object.fromEntries(Object.keys(CATEGORY_DEFINITIONS).map((key) => [key, 0]));
  for (const record of records) {
    for (const field of record.exposedFields) {
      if (field in categoryCounts) {
        categoryCounts[field] += 1;
      }
    }
  }

  const riskCategories = Object.entries(CATEGORY_DEFINITIONS)
    .map(([key, definition]) => ({
      key,
      label: definition.label,
      count: categoryCounts[key] ?? 0,
      severity: definition.severity,
      explanation: definition.explanation,
      action: definition.action,
      icon: definition.icon,
    }))
    .filter((category) => category.count > 0);

  const breachCount = records.length;
  const score = Math.round(calculateExposureScore(records.flatMap((record) => record.exposedFields)) * 10);

  const breaches = records.map((record, index) => ({
    id: `${slugify(record.siteStructure)}-${index + 1}`,
    company: record.siteStructure,
    logo: record.siteStructure.slice(0, 2).toUpperCase() || "🛡️",
    industry: "Fuite de données",
    date: formatDate(record.leakDate),
    affected: 80_000 + index * 35_000 + record.exposedFields.length * 12_500,
    severity: getSeverityFromRecord(record),
    dataTypes: record.dataTypes.length ? record.dataTypes : record.exposedFields.map((field) => CATEGORY_DEFINITIONS[field]?.label ?? field),
    exposedFields: record.exposedFields,
    attackVector: "Exposition dans une base de fuite publique",
    attackType: "Filtrage de données personnelles",
    threatActor: "Base de fuite publique",
    stillCirculating: true,
    publicReport: `https://afterleak.local/fuite/${slugify(record.siteStructure)}`,
    aiSummary: `${record.siteStructure} a exposé ${record.exposedFields.length > 0 ? record.exposedFields.map((field) => CATEGORY_DEFINITIONS[field]?.label ?? field).join(", ") : "des données sensibles"} associées à ${targetEmail}.`,
  }));

  return {
    matchFound: true,
    score,
    breachCount,
    telegramSignalCount,
    breaches,
    riskCategories,
  };
}
