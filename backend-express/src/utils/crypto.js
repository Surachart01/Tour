import crypto from 'crypto';

const isDeployedEnvironment =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);

if (isDeployedEnvironment && !process.env.BANK_ENCRYPTION_KEY) {
  throw new Error('BANK_ENCRYPTION_KEY must be configured in the production environment');
}

const KEY = process.env.BANK_ENCRYPTION_KEY || 'local-bank-encryption-key-32byte';

/**
 * Encrypts a string using AES-256-GCM.
 * Output layout is: [12 bytes IV] [Ciphertext...] [16 bytes Auth Tag]
 * Base64 encoded to match Go implementation.
 */
export function encrypt(plaintext) {
  if (!plaintext) return '';
  
  try {
    const keyBytes = Buffer.from(KEY, 'utf8');
    const iv = crypto.randomBytes(12); // GCM standard IV size
    
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);
    let ciphertext = cipher.update(plaintext, 'utf8');
    ciphertext = Buffer.concat([ciphertext, cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Layout matches Go's GCM Seal: iv (nonce) + ciphertext + tag
    const combined = Buffer.concat([iv, ciphertext, tag]);
    return combined.toString('base64');
  } catch (err) {
    console.error('Encryption failed:', err);
    throw err;
  }
}

/**
 * Decrypts a Base64-encoded string using AES-256-GCM.
 * Input layout is: [12 bytes IV] [Ciphertext...] [16 bytes Auth Tag]
 */
export function decrypt(encryptedBase64) {
  if (!encryptedBase64) return '';
  
  try {
    const keyBytes = Buffer.from(KEY, 'utf8');
    const buffer = Buffer.from(encryptedBase64, 'base64');
    
    if (buffer.length < 12 + 16) {
      throw new Error('Encrypted data too short');
    }
    
    // Extract: iv (first 12 bytes), tag (last 16 bytes), ciphertext (the rest)
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(buffer.length - 16);
    const ciphertext = buffer.subarray(12, buffer.length - 16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Decryption failed:', err);
    throw err;
  }
}
export default { encrypt, decrypt };
