// api/src/shared/utils.ts
// Cloudflare Worker – funções utilitárias compatíveis com Web APIs
// Substitui helpers.php original (apenas as funções relevantes para o Worker)

const LAST_SEEN_HOURS = 12;

/**
 * Valida se o ID do bot tem exatamente 32 caracteres alfanuméricos.
 */
export function isValidBotId(botId: string): boolean {
  return /^[0-9A-z]{32}$/.test(botId);
}

/**
 * Converte string separada por '|' em array de strings não vazias e sem duplicatas.
 */
export function apps2array(apps: string): string[] {
  return Array.from(
    new Set(
      apps
        .split('|')
        .map((item) => item.trim())
        .filter((item) => item !== ''),
    ),
  );
}

/**
 * Converte string com separadores (|, , ou quebras de linha) em array único,
 * filtrando itens que contenham ponto.
 */
export function package_list_to_array(str: string): string[] {
  let s = str.replace(/\r/g, '').trim();
  s = s.replace(/\|/g, '\n');
  s = s.replace(/,/g, '\n');

  const arr = s.split('\n');
  const result: string[] = [];

  for (const item of arr) {
    const trimmed = item.trim();
    if (trimmed !== '' && trimmed.includes('.')) {
      result.push(trimmed);
    }
  }

  return Array.from(new Set(result));
}

/**
 * Verifica se a string começa com o prefixo fornecido.
 */
export function startsWith(str: string, startString: string): boolean {
  return str.substring(0, startString.length) === startString;
}

/**
 * Verifica se a string termina com o sufixo fornecido.
 */
export function endsWith(str: string, endString: string): boolean {
  if (endString.length === 0) return true;
  return str.slice(-endString.length) === endString;
}

/**
 * Obtém o IP real do cliente a partir dos headers Cloudflare.
 * Usa CF-Connecting-IP (prioritário) ou X-Forwarded-For (fallback).
 */
export function getIp(request: Request): string {
  let ip = request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For') ?? '';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  return ip;
}

/**
 * Formata uma data para leitura humana (dd.mm.yy HH:MM ou Today, HH:MM).
 * Aceita timestamp Unix (segundos) ou string de data.
 */
export function date_readable(ts: string | number): string {
  let date: Date;

  if (typeof ts === 'string') {
    if (ts.includes(' ')) {
      date = new Date(ts);
    } else {
      date = new Date(Number(ts) * 1000);
    }
  } else {
    date = new Date(ts * 1000);
  }

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');

  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  return sameDay ? `Today, ${hh}:${mi}` : `${dd}.${mm}.${yy} ${hh}:${mi}`;
}

/**
 * Converte segundos em string legível (ex.: "1d 2h 3m 4s").
 * Remove zeros à esquerda.
 */
export function time_readable(ts: number): string {
  const total = Number(ts);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  let result = `${days}d ${hours}h ${minutes}m ${seconds}s`;

  if (startsWith(result, '0d ')) result = result.replace('0d ', '');
  if (startsWith(result, '0h ')) result = result.replace('0h ', '');
  if (startsWith(result, '0m ')) result = result.replace('0m ', '');

  return result;
}

/**
 * Converte um tamanho em bytes para string legível.
 */
export function size_readable(size: number): string {
  if (size >= 1 << 30) return `${(size / (1 << 30)).toFixed(2)} gb`;
  if (size >= 1 << 20) return `${(size / (1 << 20)).toFixed(2)} mb`;
  if (size >= 1 << 10) return `${(size / (1 << 10)).toFixed(2)} kb`;
  return `${size} bytes`;
}

/**
 * Retorna HTML com ícone colorido baseado na última atividade do bot.
 */
export function get_last_seen_marker(datetime: string | Date): string {
  const ts = datetime instanceof Date ? datetime.getTime() : new Date(datetime).getTime();
  const passed = Date.now() - ts;

  let color: string;
  if (passed < 60 * 10) color = 'lime';
  else if (passed < 60 * 30) color = 'green';
  else if (passed < 60 * 60 * 2) color = '#FFDA51';
  else if (passed < 60 * 60 * 8) color = 'orange';
  else if (passed < 60 * 60 * LAST_SEEN_HOURS) color = 'darkred';
  else color = 'black';

  return `<i class='flaticon-android-character-symbol' style='color: ${color}'></i>`;
}

/**
 * Retorna string indicando há quanto tempo o bot foi visto pela última vez.
 */
export function last_seen_time(ts: string | Date): string {
  const date1 = ts instanceof Date ? ts : new Date(ts);
  const date2 = new Date();
  const diffMs = date2.getTime() - date1.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const mStr = (minutes % 60).toString().padStart(2, '0');
  const sStr = (seconds % 60).toString().padStart(2, '0');
  let ago = `${mStr}m:${sStr}s ago`;

  if (hours > 0) ago = `${hours < 10 ? '0' + hours : hours} hours ago`;
  if (days > 0) ago = `${days} days ago`;

  return ago;
}

/**
 * Gera uma senha aleatória com o alfabeto fornecido.
 */
export function password(
  length: number,
  use_digits: boolean = false,
  alphabet: string = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
): string {
  if (use_digits) alphabet += '1234567890';
  let pass = '';
  const alphaLength = alphabet.length;
  for (let i = 0; i < length; i++) {
    pass += alphabet[Math.floor(Math.random() * alphaLength)];
  }
  return pass;
}

/**
 * Retorna string HTML com meta refresh para redirecionamento.
 */
export function redirect(url: string, timeout: number = 1): string {
  return `<meta http-equiv='refresh' content='${timeout}; url=${url}' />`;
}

/**
 * Cria uma resposta HTTP para download de arquivo.
 * @param name Nome do arquivo
 * @param data Conteúdo (string ou ArrayBuffer ou Uint8Array)
 */
export function download(name: string, data: string | ArrayBuffer | Uint8Array): Response {
  const headers = new Headers();
  headers.set('Content-Type', `application/x-force-download; name=${name}`);
  headers.set('Content-Disposition', `attachment; filename=${name}`);
  headers.set('Expires', 'Mon, 31 Dec 1999 00:00:00 GMT');
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Pragma', 'private');
  headers.set('Cache-control', 'private');
  headers.set('Content-Length', String(data instanceof ArrayBuffer ? data.byteLength : data.length));
  headers.set('Access-Control-Allow-Origin', '*'); // opcional: CORS

  return new Response(data as BodyInit, { headers });
}

/**
 * Faz uma requisição HTTP GET e retorna o texto da resposta.
 */
export async function http(url: string): Promise<string> {
  const res = await fetch(url);
  const text = await res.text();
  return text.trim();
}

/**
 * Retorna uma resposta 404 com HTML padrão.
 */
export function show_404(comm: string = ''): Response {
  const html = `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>The requested URL was not found on this server.</p>
</body></html>
<!-- ${comm} -->`;

  return new Response(html, {
    status: 404,
    headers: { 'Content-Type': 'text/html' },
  });
}

/**
 * Retorna script para exibir mensagem de sucesso.
 */
export function msg_ok(text: string, autoclose: boolean = true): string {
  const close = autoclose ? 'true' : 'false';
  return `<script>show_message('${text}', 'ok', ${close})</script>`;
}

/**
 * Retorna script para exibir mensagem de erro.
 */
export function msg_err(text: string, autoclose: boolean = true): string {
  const close = autoclose ? 'true' : 'false';
  return `<script>show_message('${text}', 'error', ${close})</script>`;
}