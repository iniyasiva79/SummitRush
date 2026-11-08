import { useSyncExternalStore } from "react";
import {
  isAvatarId,
  normalizeAccessoryIds,
  type AvatarId,
} from "./avatars";
import { STARTING_COINS } from "./constants";

export const ACCOUNTS_KEY = "summitrush.accounts";
export const SESSION_KEY = "summitrush.session";
export const ACCOUNT_EVENT = "summitrush-account";

const ITERATIONS = 100_000;
const NAME_PATTERN = /^[\p{L}][\p{L}'’.\- ]{0,39}$/u;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export type PlayerProgress = {
  completedTasks: number;
  mountainId: string | null;
  checkpoints: number;
  achievements: string[];
  successfulPredictions: number;
  unsuccessfulPredictions: number;
  bettingWins: number;
  bettingLosses: number;
};

export type PublicAccount = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  displayName: string;
  coins: number;
  progress: PlayerProgress;
  avatarId: AvatarId | null;
  equippedAccessories: string[];
};

type StoredAccount = PublicAccount & {
  passwordSalt: string;
  passwordHash: string;
  passwordIterations: number;
};

export type SignupInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  username: string;
  password: string;
};

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

let activeSnapshot: PublicAccount | null = null;

export function emptyProgress(): PlayerProgress {
  return {
    completedTasks: 0,
    mountainId: null,
    checkpoints: 0,
    achievements: [],
    successfulPredictions: 0,
    unsuccessfulPredictions: 0,
    bettingWins: 0,
    bettingLosses: 0,
  };
}

function notify() {
  activeSnapshot = readActiveAccount();
  window.dispatchEvent(new Event(ACCOUNT_EVENT));
  window.dispatchEvent(new Event("summitrush-coins"));
  window.dispatchEvent(new Event("summitrush-display-name"));
}

function subscribe(onStoreChange: () => void) {
  const handleChange = () => {
    activeSnapshot = readActiveAccount();
    onStoreChange();
  };
  window.addEventListener(ACCOUNT_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  activeSnapshot = readActiveAccount();
  return () => {
    window.removeEventListener(ACCOUNT_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

export function useActiveAccount() {
  return useSyncExternalStore(subscribe, () => activeSnapshot, () => null);
}

export function readActiveAccount(): PublicAccount | null {
  try {
    const sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      return null;
    }
    const account = readAccounts().find((entry) => entry.id === sessionId);
    return account ? toPublic(account) : null;
  } catch {
    return null;
  }
}

export function updateActiveAccount(
  partial: Partial<
    Pick<PublicAccount, "displayName" | "coins" | "progress" | "avatarId" | "equippedAccessories">
  >,
): void {
  const sessionId = readSessionId();
  if (!sessionId) {
    return;
  }
  const accounts = readAccounts();
  const index = accounts.findIndex((entry) => entry.id === sessionId);
  if (index < 0) {
    return;
  }
  const current = accounts[index];
  accounts[index] = {
    ...current,
    displayName:
      typeof partial.displayName === "string"
        ? partial.displayName.slice(0, 24)
        : current.displayName,
    coins:
      typeof partial.coins === "number"
        ? Math.max(0, Math.floor(partial.coins))
        : current.coins,
    progress: partial.progress
      ? normalizeProgress(partial.progress)
      : current.progress,
    avatarId:
      partial.avatarId === null
        ? null
        : partial.avatarId && isAvatarId(partial.avatarId)
          ? partial.avatarId
          : current.avatarId,
    equippedAccessories: partial.equippedAccessories
      ? normalizeAccessoryIds(partial.equippedAccessories)
      : current.equippedAccessories,
  };
  writeAccounts(accounts);
  notify();
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  notify();
}

export async function signup(
  input: SignupInput,
): Promise<{ ok: true; account: PublicAccount } | { ok: false; errors: SignupErrors }> {
  const errors = validateSignup(input, readAccounts());
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await deriveHash(input.password, salt, ITERATIONS);
  const account: StoredAccount = {
    id: crypto.randomUUID(),
    username: input.username.trim(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth: input.dateOfBirth,
    displayName: input.username.trim(),
    coins: STARTING_COINS,
    progress: emptyProgress(),
    avatarId: null,
    equippedAccessories: [],
    passwordSalt: bytesToBase64(salt),
    passwordHash,
    passwordIterations: ITERATIONS,
  };

  try {
    const accounts = readAccounts();
    accounts.push(account);
    writeAccounts(accounts);
    localStorage.setItem(SESSION_KEY, account.id);
  } catch {
    return {
      ok: false,
      errors: { username: "This browser could not save the account." },
    };
  }

  notify();
  return { ok: true, account: toPublic(account) };
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: true; account: PublicAccount } | { ok: false; error: string }> {
  const accounts = readAccounts();
  const account = accounts.find(
    (entry) => entry.username.toLowerCase() === username.trim().toLowerCase(),
  );
  const mismatch = "That username and password do not match.";

  if (!account) {
    await deriveHash(password, new Uint8Array(16).fill(7), ITERATIONS);
    return { ok: false, error: mismatch };
  }

  const actual = await deriveHash(
    password,
    base64ToBytes(account.passwordSalt),
    account.passwordIterations || ITERATIONS,
  );
  if (!safeEqual(actual, account.passwordHash)) {
    return { ok: false, error: mismatch };
  }

  try {
    localStorage.setItem(SESSION_KEY, account.id);
  } catch {
    return { ok: false, error: "This browser could not start the session." };
  }

  notify();
  return { ok: true, account: toPublic(account) };
}

function validateSignup(input: SignupInput, accounts: StoredAccount[]): SignupErrors {
  const errors: SignupErrors = {};
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const username = input.username.trim();

  if (!NAME_PATTERN.test(firstName)) {
    errors.firstName = "Enter a first name using letters.";
  }
  if (!NAME_PATTERN.test(lastName)) {
    errors.lastName = "Enter a last name using letters.";
  }
  if (!isAdultBirthday(input.dateOfBirth)) {
    errors.dateOfBirth = "Enter a valid date of birth. Players must be 18 or older.";
  }
  if (!USERNAME_PATTERN.test(username)) {
    errors.username = "Use 3 to 20 letters, numbers, or underscores.";
  } else if (
    accounts.some((entry) => entry.username.toLowerCase() === username.toLowerCase())
  ) {
    errors.username = "That username is already saved on this browser.";
  }
  if (input.password.length < 8 || input.password.length > 72 || !/\d/.test(input.password)) {
    errors.password = "Use at least 8 characters, including one number.";
  }
  return errors;
}

function isAdultBirthday(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    year < 1900
  ) {
    return false;
  }
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDelta = today.getMonth() - (month - 1);
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < day)) {
    age -= 1;
  }
  return age >= 18 && date.getTime() <= today.getTime();
}

function readSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isStoredAccount).map(normalizeAccount);
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (!value || typeof value !== "object") {
    return false;
  }
  const account = value as Partial<StoredAccount>;
  return (
    typeof account.id === "string" &&
    typeof account.username === "string" &&
    typeof account.passwordHash === "string" &&
    typeof account.passwordSalt === "string"
  );
}

function normalizeAccount(account: StoredAccount): StoredAccount {
  return {
    ...account,
    firstName: account.firstName ?? "",
    lastName: account.lastName ?? "",
    dateOfBirth: account.dateOfBirth ?? "",
    displayName: (account.displayName ?? "").slice(0, 24),
    coins:
      Number.isInteger(account.coins) && account.coins >= 0
        ? account.coins
        : STARTING_COINS,
    progress: normalizeProgress(account.progress),
    avatarId: isAvatarId(account.avatarId) ? account.avatarId : null,
    equippedAccessories: normalizeAccessoryIds(account.equippedAccessories),
    passwordIterations: account.passwordIterations || ITERATIONS,
  };
}

function normalizeProgress(value: Partial<PlayerProgress> | undefined): PlayerProgress {
  const base = emptyProgress();
  if (!value) {
    return base;
  }
  return {
    completedTasks: nonNegative(value.completedTasks),
    mountainId: typeof value.mountainId === "string" ? value.mountainId : null,
    checkpoints: nonNegative(value.checkpoints),
    achievements: Array.isArray(value.achievements)
      ? value.achievements.filter((item) => typeof item === "string")
      : [],
    successfulPredictions: nonNegative(value.successfulPredictions),
    unsuccessfulPredictions: nonNegative(value.unsuccessfulPredictions),
    bettingWins: nonNegative(value.bettingWins),
    bettingLosses: nonNegative(value.bettingLosses),
  };
}

function nonNegative(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 0;
}

function toPublic(account: StoredAccount): PublicAccount {
  return {
    id: account.id,
    username: account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    dateOfBirth: account.dateOfBirth,
    displayName: account.displayName,
    coins: account.coins,
    progress: account.progress,
    avatarId: account.avatarId,
    equippedAccessories: account.equippedAccessories,
  };
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: toBufferSource(salt), iterations },
    key,
    256,
  );
  return [...new Uint8Array(bits)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
