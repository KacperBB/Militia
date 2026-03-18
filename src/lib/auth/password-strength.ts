export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4; // 0 = very weak, 4 = strong
  label: string;
  color: string;
  isStrong: boolean; // true only if score >= 3
  feedback: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      label: "Brak hasła",
      color: "bg-slate-200",
      isStrong: false,
      feedback: ["Wpisz hasło"],
    };
  }

  // Length check
  if (password.length >= 8) score++;
  else feedback.push("Minimum 8 znaków");

  if (password.length >= 12) score++;
  else if (password.length < 8) feedback.push("Potrzeba minimum 8 znaków");

  // Character diversity checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLower) feedback.push("Dodaj małe litery (a-z)");
  if (!hasUpper) feedback.push("Dodaj duże litery (A-Z)");
  if (!hasDigit) feedback.push("Dodaj cyfrę (0-9)");
  if (!hasSpecial) feedback.push("Rozważ znaki specjalne");

  const characterTypes = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (characterTypes >= 3) score++;
  if (characterTypes >= 4) score++;

  // Score mapping
  let label = "";
  let color = "";
  let isStrong = false;

  if (score <= 1) {
    label = "Bardzo słabe";
    color = "bg-red-500";
  } else if (score === 2) {
    label = "Słabe";
    color = "bg-orange-500";
  } else if (score === 3) {
    label = "Średnie";
    color = "bg-yellow-500";
    isStrong = true;
  } else if (score === 4) {
    label = "Silne";
    color = "bg-green-500";
    isStrong = true;
  }

  return {
    score: Math.min(score, 4) as 0 | 1 | 2 | 3 | 4,
    label,
    color,
    isStrong,
    feedback: feedback.slice(0, 3),
  };
}
