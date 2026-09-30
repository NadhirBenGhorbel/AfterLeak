export type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
};

const USERS_STORAGE_KEY = "afterleak-demo-users";
const CURRENT_USER_STORAGE_KEY = "afterleak-demo-current-user";
const DEMO_EMAIL = "demo@afterleak.com";
const DEMO_PASSWORD = "demo1234";
let inMemoryUsers: AuthUser[] = [];
let inMemoryCurrentUser: AuthUser | null = null;

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readUsers(): AuthUser[] {
  const storage = safeStorage();

  if (storage) {
    try {
      const raw = storage.getItem(USERS_STORAGE_KEY);
      if (!raw) return inMemoryUsers;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return inMemoryUsers;

      const users = parsed.filter((item): item is AuthUser => Boolean(item && typeof item.email === "string"));
      inMemoryUsers = users;
      return users;
    } catch {
      return inMemoryUsers;
    }
  }

  return inMemoryUsers;
}

function writeUsers(users: AuthUser[]) {
  const storage = safeStorage();
  inMemoryUsers = users;

  if (!storage) return;

  try {
    storage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Fall back to in-memory storage when browser storage is unavailable.
  }
}

function ensureDemoUser() {
  const users = readUsers();
  if (!users.some((user) => user.email.toLowerCase() === DEMO_EMAIL)) {
    users.push({
      id: createId(),
      name: "Demo User",
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      createdAt: new Date().toISOString(),
    });
    writeUsers(users);
  }
  return users;
}

export function getDemoCredentials() {
  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}

export function getCurrentUser(): AuthUser | null {
  const storage = safeStorage();

  if (storage) {
    try {
      const raw = storage.getItem(CURRENT_USER_STORAGE_KEY);
      if (!raw) return inMemoryCurrentUser;

      const parsed = JSON.parse(raw) as AuthUser;
      inMemoryCurrentUser = parsed;
      return parsed;
    } catch {
      return inMemoryCurrentUser;
    }
  }

  return inMemoryCurrentUser;
}

export function setCurrentUser(user: AuthUser | null) {
  const storage = safeStorage();
  inMemoryCurrentUser = user;

  if (!storage) return;

  try {
    if (!user) {
      storage.removeItem(CURRENT_USER_STORAGE_KEY);
      return;
    }

    storage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Fall back to in-memory storage when browser storage is unavailable.
  }
}

export function loginUser(email: string, password: string): AuthUser {
  const normalizedEmail = email.trim().toLowerCase();
  const users = ensureDemoUser();
  const user = users.find((entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password);

  if (!user) {
    throw new Error("Email ou mot de passe incorrect.");
  }

  setCurrentUser(user);
  return user;
}

export function registerUser(input: { name: string; email: string; password: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    throw new Error("Veuillez remplir tous les champs.");
  }

  if (password.length < 6) {
    throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
  }

  const users = ensureDemoUser();
  const exists = users.some((user) => user.email.toLowerCase() === email);
  if (exists) {
    throw new Error("Cette adresse email est déjà utilisée.");
  }

  const user: AuthUser = {
    id: createId(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);
  setCurrentUser(user);
  return user;
}

export function logoutUser() {
  setCurrentUser(null);
}

export function isAuthenticated() {
  return Boolean(getCurrentUser());
}
