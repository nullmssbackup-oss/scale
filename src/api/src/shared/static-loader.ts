// api/src/shared/static-loader.ts
// Cloudflare Worker – carrega arquivos estáticos da pasta /static com cache em memória.
// Substitui o file_get_contents do PHP para leitura de avs_list.txt, expires, etc.
// Para produção, configure no wrangler.toml:
//   [assets]
//   directory = "./static"

const cache = new Map<string, string>();

/**
 * Carrega um arquivo estático e retorna seu conteúdo como string.
 * Usa cache em memória para evitar leituras repetidas.
 * Se o arquivo não for encontrado, retorna null.
 *
 * @param filename Nome do arquivo (ex.: 'avs_list.txt')
 * @param request Request original para montar URL absoluta (necessário se não houver env.ASSETS)
 */
export async function loadStaticFileCached(
  filename: string,
  request?: Request,
): Promise<string | null> {
  // Verifica cache primeiro
  if (cache.has(filename)) {
    return cache.get(filename) ?? null;
  }

  let content: string | null = null;

  try {
    // Estratégia 1: usar o binding de assets se disponível (geralmente via env.ASSETS)
    const assetsBinding = (globalThis as any).ASSETS;
    if (assetsBinding && typeof assetsBinding.fetch === 'function') {
      const assetResponse = await assetsBinding.fetch(new URL(`/static/${filename}`, 'https://worker.local'));
      if (assetResponse.ok) {
        content = await assetResponse.text();
      }
    }

    // Estratégia 2: fallback via fetch usando a URL do request original
    if (content === null && request) {
      const url = new URL(`/static/${filename}`, request.url);
      const response = await fetch(url.toString());
      if (response.ok) {
        content = await response.text();
      }
    }
  } catch (err) {
    console.warn(`static-loader: falha ao ler ${filename}:`, err);
    content = null;
  }

  // Armazena no cache (mesmo que null para evitar novas tentativas? melhor não cachear null)
  if (content !== null) {
    cache.set(filename, content);
  }

  return content;
}