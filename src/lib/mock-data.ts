// Mock data en français pour la démo Sentinel

export type Severity = "faible" | "moyen" | "élevé" | "critique";

export interface Breach {
  id: string;
  company: string;
  logo: string;
  industry: string;
  year: number;
  date: string;
  affected: number;
  severity: Severity;
  dataTypes: string[];
  attackVector: string;
  attackType: string;
  threatActor: string;
  stillCirculating: boolean;
  publicReport: string;
  aiSummary: string;
}

export const BREACHES: Breach[] = [
  {
    id: "linkedin-2021",
    company: "LinkedIn",
    logo: "💼",
    industry: "Réseau professionnel",
    year: 2021,
    date: "Juin 2021",
    affected: 700_000_000,
    severity: "critique",
    dataTypes: ["Email", "Nom complet", "Numéro de téléphone", "Employeur", "Géolocalisation"],
    attackVector: "Scraping massif via API non sécurisée",
    attackType: "Exfiltration de données",
    threatActor: "GodUserTom",
    stillCirculating: true,
    publicReport: "https://www.linkedin.com/news/2021/data",
    aiSummary:
      "Cette fuite alimente encore aujourd'hui la majorité des campagnes de spear-phishing professionnel ciblant les cadres francophones. Vos informations professionnelles sont disponibles publiquement.",
  },
  {
    id: "adobe-2019",
    company: "Adobe",
    logo: "🎨",
    industry: "Logiciel",
    year: 2019,
    date: "Octobre 2019",
    affected: 7_500_000,
    severity: "élevé",
    dataTypes: ["Email", "Mot de passe (hashé)", "Date d'inscription"],
    attackVector: "Base Elasticsearch exposée",
    attackType: "Mauvaise configuration",
    threatActor: "Inconnu",
    stillCirculating: true,
    publicReport: "https://helpx.adobe.com/security.html",
    aiSummary:
      "Vos identifiants Adobe figurent dans plusieurs combolists. Un attaquant peut les rejouer contre Microsoft 365, Google Workspace ou des plateformes bancaires.",
  },
  {
    id: "dropbox-2022",
    company: "Dropbox",
    logo: "📦",
    industry: "Cloud / Stockage",
    year: 2022,
    date: "Novembre 2022",
    affected: 130_000_000,
    severity: "élevé",
    dataTypes: ["Email", "Nom", "Code source interne"],
    attackVector: "Phishing d'un employé",
    attackType: "Compromission d'accès",
    threatActor: "ShinyHunters",
    stillCirculating: false,
    publicReport: "https://dropbox.tech/security",
    aiSummary:
      "Aucun mot de passe utilisateur n'a fuité, mais votre adresse est désormais une cible privilégiée pour des courriels d'hameçonnage imitant Dropbox.",
  },
  {
    id: "ovh-2013",
    company: "OVHcloud",
    logo: "🇫🇷",
    industry: "Hébergement",
    year: 2013,
    date: "Juillet 2013",
    affected: 1_400_000,
    severity: "moyen",
    dataTypes: ["Email", "Nom", "Adresse postale"],
    attackVector: "Compromission administrateur interne",
    attackType: "Vol d'identifiants",
    threatActor: "Inconnu",
    stillCirculating: false,
    publicReport: "https://www.ovh.com/fr/news/",
    aiSummary:
      "Fuite ancienne mais toujours utilisée pour reconstituer des profils complets sur le marché francophone.",
  },
  {
    id: "facebook-2019",
    company: "Facebook",
    logo: "📘",
    industry: "Réseau social",
    year: 2019,
    date: "Avril 2019",
    affected: 533_000_000,
    severity: "critique",
    dataTypes: ["Email", "Téléphone", "Date de naissance", "Lieu de résidence", "Relation"],
    attackVector: "Exploitation de l'API contacts",
    attackType: "Scraping",
    threatActor: "Inconnu",
    stillCirculating: true,
    publicReport: "https://about.fb.com/news/2021/04/facts-on-news-reports-about-facebook-data/",
    aiSummary:
      "Combinaison toxique : téléphone + email + date de naissance. Risque très élevé de SIM swapping et d'usurpation auprès des services bancaires.",
  },
  {
    id: "twitch-2021",
    company: "Twitch",
    logo: "🎮",
    industry: "Streaming",
    year: 2021,
    date: "Octobre 2021",
    affected: 125_000_000,
    severity: "moyen",
    dataTypes: ["Email", "Pseudonyme", "Revenus créateurs"],
    attackVector: "Mauvaise configuration serveur Git",
    attackType: "Exfiltration complète",
    threatActor: "Anonyme",
    stillCirculating: false,
    publicReport: "https://blog.twitch.tv/en/2021/10/06/updates-on-the-twitch-security-incident/",
    aiSummary:
      "Votre pseudonyme Twitch est lié à votre identité réelle dans plusieurs bases croisées.",
  },
];

export interface RiskCategory {
  key: string;
  label: string;
  count: number;
  severity: Severity;
  explanation: string;
  action: string;
  icon: string;
}

export const RISK_CATEGORIES: RiskCategory[] = [
  { key: "email", label: "Emails exposés", count: 6, severity: "élevé", icon: "Mail",
    explanation: "Votre adresse apparaît dans 6 fuites distinctes, dont 2 actives.",
    action: "Activez les alias d'email pour les services non critiques." },
  { key: "password", label: "Mots de passe fuités", count: 4, severity: "critique", icon: "KeyRound",
    explanation: "4 mots de passe en clair circulent dans des combolists publiques.",
    action: "Changez immédiatement et activez la 2FA partout." },
  { key: "phone", label: "Numéros de téléphone", count: 2, severity: "élevé", icon: "Phone",
    explanation: "Votre numéro est lié à votre identité dans 2 bases.",
    action: "Demandez le verrouillage SIM auprès de votre opérateur." },
  { key: "address", label: "Adresses postales", count: 1, severity: "moyen", icon: "Home",
    explanation: "Une adresse de résidence ancienne a fuité en 2013.",
    action: "Vérifiez votre exposition cadastrale." },
  { key: "gov-id", label: "Pièces d'identité", count: 0, severity: "faible", icon: "ShieldCheck",
    explanation: "Aucun document officiel détecté pour le moment.",
    action: "Continuez à surveiller cette catégorie." },
  { key: "username", label: "Noms d'utilisateur", count: 9, severity: "moyen", icon: "AtSign",
    explanation: "9 pseudonymes vous relient entre services personnels et professionnels.",
    action: "Cloisonnez vos identités numériques." },
  { key: "ip", label: "Adresses IP", count: 3, severity: "faible", icon: "Globe",
    explanation: "Quelques IP résidentielles historiques sont apparues.",
    action: "Activez un VPN de confiance pour les usages sensibles." },
  { key: "card", label: "Cartes bancaires", count: 0, severity: "faible", icon: "CreditCard",
    explanation: "Aucune information de paiement détectée.",
    action: "Surveillez votre relevé bancaire." },
  { key: "dob", label: "Date de naissance", count: 2, severity: "élevé", icon: "Cake",
    explanation: "Votre date de naissance est largement diffusée.",
    action: "Évitez de l'utiliser comme question de sécurité." },
  { key: "secq", label: "Questions secrètes", count: 1, severity: "moyen", icon: "HelpCircle",
    explanation: "Une réponse à une question de sécurité a fuité.",
    action: "Remplacez par des réponses aléatoires stockées dans un coffre." },
];

export interface AttackLikelihood {
  label: string;
  probability: number;
  description: string;
}

export const ATTACK_LIKELIHOODS: AttackLikelihood[] = [
  { label: "Hameçonnage ciblé", probability: 87, description: "Très probable — vos données pro sont publiques." },
  { label: "Credential stuffing", probability: 78, description: "Vos identifiants circulent activement." },
  { label: "Usurpation d'identité", probability: 64, description: "Combinaison email + téléphone + date de naissance." },
  { label: "SIM swapping", probability: 52, description: "Risque accru en raison du numéro exposé." },
  { label: "Prise de contrôle de compte", probability: 71, description: "Plusieurs vecteurs combinables." },
];

export const ATTACKER_PROFILE = {
  knows: [
    { label: "Nom complet", confidence: 98 },
    { label: "Email principal", confidence: 100 },
    { label: "Téléphone mobile", confidence: 92 },
    { label: "Employeur actuel", confidence: 87 },
    { label: "Adresse de résidence", confidence: 64 },
    { label: "Date de naissance", confidence: 88 },
    { label: "Anciens pseudos", confidence: 79 },
    { label: "Historique de mots de passe", confidence: 71 },
    { label: "Services fréquentés", confidence: 83 },
  ],
  attacks: [
    "Spear-phishing",
    "Usurpation d'identité",
    "Password spraying",
    "Credential stuffing",
    "SIM swapping",
    "Compromission de messagerie pro (BEC)",
  ],
};

export interface Recommendation {
  id: string;
  priority: "Critique" | "Élevée" | "Moyenne" | "Faible";
  title: string;
  description: string;
}

export const RECOMMENDATIONS: Recommendation[] = [
  { id: "r1", priority: "Critique", title: "Activez la double authentification sur Google",
    description: "Votre compte Google est la clé de voûte de votre identité numérique." },
  { id: "r2", priority: "Critique", title: "Changez les 4 mots de passe réutilisés",
    description: "Détectés dans des combolists actives — risque immédiat." },
  { id: "r3", priority: "Élevée", title: "Gelez votre dossier de crédit",
    description: "Empêche l'ouverture frauduleuse de comptes en votre nom." },
  { id: "r4", priority: "Élevée", title: "Demandez un verrouillage SIM",
    description: "Contactez votre opérateur pour bloquer tout transfert de ligne." },
  { id: "r5", priority: "Moyenne", title: "Renouvelez vos clés API personnelles",
    description: "Les jetons GitHub/Vercel peuvent figurer dans des dépôts publics." },
  { id: "r6", priority: "Faible", title: "Mettez à jour vos questions secrètes",
    description: "Utilisez des réponses aléatoires stockées dans 1Password ou Bitwarden." },
];

export const THREAT_FEED = [
  { title: "Nouvelle campagne LockBit 4.0 contre le secteur santé en France", time: "il y a 14 min", tag: "Ransomware", severity: "critique" as Severity },
  { title: "Infostealer RedLine distribué via fausses extensions VSCode", time: "il y a 1 h", tag: "Infostealer", severity: "élevé" as Severity },
  { title: "Fuite : 2,3 M d'identifiants français sur un forum cybercriminel", time: "il y a 3 h", tag: "Credential leak", severity: "élevé" as Severity },
  { title: "Vague de SIM swap ciblant les dirigeants du CAC 40", time: "il y a 6 h", tag: "Fraude", severity: "moyen" as Severity },
  { title: "Vulnérabilité critique CVE-2026-1042 dans Outlook", time: "hier", tag: "CVE", severity: "critique" as Severity },
];

export function severityColor(s: Severity) {
  switch (s) {
    case "faible": return "text-success border-success/30 bg-success/10";
    case "moyen": return "text-warning border-warning/30 bg-warning/10";
    case "élevé": return "text-danger border-danger/30 bg-danger/10";
    case "critique": return "text-critical border-critical/40 bg-critical/15";
  }
}

export function severityHex(s: Severity) {
  switch (s) {
    case "faible": return "oklch(0.78 0.18 155)";
    case "moyen": return "oklch(0.82 0.17 85)";
    case "élevé": return "oklch(0.72 0.21 40)";
    case "critique": return "oklch(0.62 0.25 15)";
  }
}
