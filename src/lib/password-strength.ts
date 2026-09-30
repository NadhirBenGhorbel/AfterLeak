export type PasswordStrengthAssessment = {
  score: number;
  label: string;
  crackTimeEstimate: string;
  strengthTips: string[];
  passwordPolicyNote: string;
  passwordAdvice: string;
  nextSteps: string[];
};

export function evaluatePasswordStrength(password: string): PasswordStrengthAssessment {
  const value = password.trim();
  if (!value) {
    return {
      score: 0,
      label: "À tester",
      crackTimeEstimate: "Veuillez saisir un mot de passe pour obtenir une estimation.",
      strengthTips: [
        "Ajoutez au moins 16 caractères.",
        "Mélangez lettres, chiffres et symboles.",
        "Évitez les mots ordinaires ou basés sur vos données personnelles.",
      ],
      passwordPolicyNote: "Un mot de passe vide ne peut pas être considéré comme robuste.",
      passwordAdvice: "Saisissez un mot de passe pour obtenir une évaluation en temps réel.",
      nextSteps: [
        "Choisissez au moins 16 caractères.",
        "Mélangez casse, chiffres et symboles.",
        "Ne réutilisez pas ce mot de passe ailleurs.",
      ],
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

  const strengthTips = [
    "Ajoutez au moins 4 caractères supplémentaires si vous souhaitez gagner en robustesse.",
    "N’utilisez jamais ce mot de passe ailleurs.",
    "Stockez-le dans un gestionnaire de mots de passe sécurisé.",
  ];

  const passwordAdvice = clampedScore >= 65
    ? "Ce mot de passe est déjà assez solide, mais gardez-le unique et gardez la 2FA activée."
    : "Allongez ce mot de passe et mélangez davantage les caractères pour réduire sa cassabilité.";

  return {
    score: clampedScore,
    label,
    crackTimeEstimate,
    strengthTips,
    passwordPolicyNote: "Un mot de passe robuste combine longueur, variété de caractères et absence de motifs évidents.",
    passwordAdvice,
    nextSteps: [
      "Conservez ce mot de passe dans un gestionnaire sécurisé.",
      "Évitez de le réutiliser sur d’autres services.",
      "Activez la 2FA si elle est disponible.",
    ],
  };
}
