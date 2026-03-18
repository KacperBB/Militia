import { randomBytes, createHash } from "node:crypto";

import bcrypt from "bcryptjs";

function getPasswordPepper() {
  return process.env.PASSWORD_PEPPER || process.env.AUTH_SECRET || "";
}

function toPepperedPassword(password: string) {
  return `${password}:${getPasswordPepper()}`;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(toPepperedPassword(password), 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(toPepperedPassword(password), passwordHash);
}

export function generateOpaqueToken(size = 32) {
  return randomBytes(size).toString("hex");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
