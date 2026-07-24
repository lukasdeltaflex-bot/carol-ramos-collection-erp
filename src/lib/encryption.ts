import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const SALT = "carol_ramos_erp_marketplace_salt_2026";

// Obtém a chave simétrica de 32 bytes derivada do ambiente
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY || process.env.FIREBASE_PRIVATE_KEY || "carol-ramos-collection-erp-master-key-2026";
  return crypto.scryptSync(secret, SALT, 32);
}

/**
 * Criptografa uma string usando AES-256-GCM.
 * Retorna o resultado no formato 'ivHex:authTagHex:encryptedHex'.
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const key = getMasterKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");
    return `${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("[Encryption Error] Falha ao criptografar dado:", error);
    throw new Error("Erro de criptografia de credenciais.");
  }
}

/**
 * Descriptografa uma string AES-256-GCM no formato 'ivHex:authTagHex:encryptedHex'.
 */
export function decrypt(cipherText: string): string {
  if (!cipherText) return "";
  // Se não estiver no formato criptografado esperável (sem :), retorna como fallback seguro se for chave legada
  if (!cipherText.includes(":")) return cipherText;

  try {
    const parts = cipherText.split(":");
    if (parts.length !== 3) {
      throw new Error("Formato de hash criptográfico inválido.");
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("[Encryption Error] Falha ao descriptografar dado:", error);
    throw new Error("Falha na descriptografia de credenciais. Chave corrompida ou inválida.");
  }
}
