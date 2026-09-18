import crypto from 'crypto';

// Криптиране на чувствителни полета (ЕГН, номер на паспорт) преди запис във Firestore — прилага се
// в checkout Server Action-а, СЛЕД валидацията на токена, ПРЕДИ записа в базата.
//
// AES-256-GCM: симетрично криптиране (същия ключ криптира и декриптира), с вграден "authentication tag" —
// ако някой се опита да промени криптирания текст директно в базата, decryptField() ще гръмне с грешка,
// вместо тихо да върне грешни данни. Това е стандартен, добре тестван подход — не измислен от нулата.
//
// Ключът (DATA_ENCRYPTION_KEY) НИКОГА не се пази в кода — само в .env.local локално и Secret Manager
// в продукция, по същия модел като GA4_PRIVATE_KEY/OPENAI_API_KEY от по-рано тази сесия.

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const keyBase64 = process.env.DATA_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error('DATA_ENCRYPTION_KEY не е зададена в environment променливите');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('DATA_ENCRYPTION_KEY трябва да декодира до точно 32 байта (base64-кодиран AES-256 ключ)');
  }
  return key;
}

// Криптира текст. Връща един стринг във формат "iv:authTag:ciphertext" (всяка част base64) — самостоятелно
// съдържащ всичко нужно за декриптиране по-късно, без да пазим IV-то отделно някъде другаде.
export function encryptField(plainText: string): string {
  if (!plainText) return '';
  const key = getKey();
  // IV (Initialization Vector) — случаен за ВСЯКО отделно криптиране, дори за един и същ текст.
  // Без това, еднакви ЕГН-та биха дали еднакъв криптиран изход — теч на информация.
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

// Декриптира текст, произведен от encryptField(). Ако форматът не съвпада (3 части, разделени с ":"),
// връщаме стойността каквато е (не гръмваме) — покрива стари записи, които никога не са
// били криптирани (напр. легаси клиентски данни от преди въвеждането на криптирането) — така едно
// разваляно поле не чупи цяла заявка за декриптиране на няколко записа.
export function decryptField(encoded: string): string {
  if (!encoded) return '';
  const parts = encoded.split(':');
  if (parts.length !== 3) {
    return encoded;
  }
  const [ivB64, authTagB64, dataB64] = parts;
  try {
    const key = getKey();
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    // Невалиден/повреден формат — връщаме стойността каквато е, вместо да сринем цялата заявка.
    return encoded;
  }
}
