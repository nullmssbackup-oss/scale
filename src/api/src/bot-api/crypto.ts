// api/src/bot-api/crypto.ts
// Cloudflare Worker – usa a biblioteca crypto-js para suportar MD5 e AES-ECB (não disponíveis na Web Crypto API)
// Instale a dependência: npm install crypto-js @types/crypto-js

import CryptoJS from 'crypto-js';

/**
 * Calcula o hash MD5 de uma string e retorna em hexadecimal.
 */
export function md5(str: string): string {
  return CryptoJS.MD5(str).toString(CryptoJS.enc.Hex);
}

/**
 * Criptografa uma string usando AES-128-ECB com chave derivada do MD5 da chave fornecida.
 * Retorna o resultado em Base64 (compatível com o PHP mcrypt).
 */
export function aesEncrypt(plain: string, key: string): string {
  const keyHex = md5(key);
  const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
  const encrypted = CryptoJS.AES.encrypt(plain, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  // crypto-js por padrão retorna uma string Base64 com o formato OpenSSL.
  // Para compatibilidade com o PHP (que espera apenas o ciphertext em Base64),
  // retornamos apenas o ciphertext codificado.
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

/**
 * Descriptografa uma string em Base64 usando AES-128-ECB com chave derivada do MD5 da chave fornecida.
 */
export function aesDecrypt(encryptedBase64: string, key: string): string {
  const keyHex = md5(key);
  const keyWordArray = CryptoJS.enc.Hex.parse(keyHex);
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, keyWordArray, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
}