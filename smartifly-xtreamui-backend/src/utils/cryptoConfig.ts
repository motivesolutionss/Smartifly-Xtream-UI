// src/utils/cryptoConfig.ts
import { randomBytes, createCipheriv } from "crypto";

import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";

// Ensure key is 32 bytes
function getKey(): Buffer {
  const key = env.configEncryptionKey;
  if (!key || key.length < 32) {
    throw new Error("CONFIG_ENCRYPTION_KEY must be at least 32 characters");
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}

export function encryptConfig(payload: unknown): {
  iv: string;
  ciphertext: string;
  tag: string;
} {
  const key = getKey();
  const iv = randomBytes(12); // 96-bit IV for GCM

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    tag: tag.toString("base64"),
  };
}
