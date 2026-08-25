# prepare-backend.ps1
# Prepara a pasta api para deploy no Cloudflare Workers.
# NÃO faz login nem deploy; apenas corrige estrutura e arquivos.
# Execute na raiz do repositório (onde estão api/ e frontend/).

$ErrorActionPreference = "Stop"

Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host " PREPARAR BACKEND PARA DEPLOY (WORKER)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Verifica se estamos na raiz correta
if (-not (Test-Path "api")) {
    Write-Host "Erro: pasta 'api' não encontrada. Execute na raiz do repositório." -ForegroundColor Red
    exit 1
}

# Remove possíveis pastas duplicadas acidentais na raiz
if (Test-Path "src") {
    Write-Host "Removendo pasta 'src' duplicada na raiz..." -ForegroundColor Yellow
    Remove-Item -Path "src" -Recurse -Force
    Write-Host "Removida." -ForegroundColor Green
}

# Garante estrutura de diretórios
$apiSrc = "api/src"
if (-not (Test-Path $apiSrc)) {
    New-Item -ItemType Directory -Path $apiSrc -Force | Out-Null
    Write-Host "Criada pasta $apiSrc" -ForegroundColor Green
} else {
    Write-Host "Pasta $apiSrc já existe." -ForegroundColor Green
}

# ------------------------------------------------------------
# 1. wrangler.toml (sempre sobrescreve)
# ------------------------------------------------------------
Write-Host "`nAtualizando api/wrangler.toml..." -ForegroundColor Yellow
@"
name = "bot-api"
main = "src/index.ts"
compatibility_date = "2024-10-01"
"@ | Set-Content -Path "api/wrangler.toml" -Encoding UTF8 -Force
Write-Host "Arquivo criado/substituído." -ForegroundColor Green

# ------------------------------------------------------------
# 2. api/src/index.ts (sempre sobrescreve com Worker mínimo)
# ------------------------------------------------------------
Write-Host "`nAtualizando api/src/index.ts..." -ForegroundColor Yellow
@"
export default {
  async fetch(request: Request, env: any) {
    return new Response('Worker OK', { status: 200 });
  }
};
"@ | Set-Content -Path "api/src/index.ts" -Encoding UTF8 -Force
Write-Host "Worker mínimo criado/substituído." -ForegroundColor Green

# ------------------------------------------------------------
# 3. api/package.json (se não existir, cria; se existir, sobrescreve)
# ------------------------------------------------------------
Write-Host "`nAtualizando api/package.json..." -ForegroundColor Yellow
$packageJson = @"
{
  "name": "bot-api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4.125.0"
  }
}
"@
Set-Content -Path "api/package.json" -Value $packageJson -Encoding UTF8 -Force
Write-Host "package.json criado/substituído." -ForegroundColor Green

# ------------------------------------------------------------
# 4. .gitignore (garante que não vazem segredos)
# ------------------------------------------------------------
Write-Host "`nAtualizando .gitignore..." -ForegroundColor Yellow
$gitignoreContent = @"
node_modules
dist
.env
.dev.vars
*.env
*.dev.vars
api/.env
frontend/.env
"@
if (-not (Test-Path ".gitignore")) {
    Set-Content -Path ".gitignore" -Value $gitignoreContent -Encoding UTF8
    Write-Host ".gitignore criado." -ForegroundColor Green
} else {
    # Adiciona as entradas se não existirem
    $existing = Get-Content ".gitignore" -Raw
    $entries = @("node_modules", "dist", ".env", ".dev.vars", "*.env", "*.dev.vars", "api/.env", "frontend/.env")
    $updated = $existing
    foreach ($entry in $entries) {
        if ($updated -notmatch [regex]::Escape($entry)) {
            $updated += "`n$entry"
        }
    }
    Set-Content -Path ".gitignore" -Value $updated -Encoding UTF8
    Write-Host ".gitignore atualizado." -ForegroundColor Green
}

# ------------------------------------------------------------
# 5. Instalar dependências
# ------------------------------------------------------------
Write-Host "`nInstalando dependências da API..." -ForegroundColor Cyan
Set-Location "api"
npm install
Set-Location ..

# ------------------------------------------------------------
# Conclusão
# ------------------------------------------------------------
Write-Host "`n==============================================" -ForegroundColor Cyan
Write-Host " BACKEND PRONTO PARA DEPLOY" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Agora você pode:" -ForegroundColor White
Write-Host "  - Testar localmente: cd api && npx wrangler dev"
Write-Host "  - Publicar manualmente: cd api && npx wrangler deploy"
Write-Host "  - Ou conectar ao GitHub no painel do Cloudflare (Build > Root directory = api)"
Write-Host ""
Write-Host "Lembre-se de configurar as variáveis SUPABASE_URL e SUPABASE_ANON_KEY como secrets no Cloudflare." -ForegroundColor Yellow