# Script para atualizar repositório GitHub local -> remoto
# Execute no diretório raiz do projeto (onde está a pasta .git, se já houver)

$ErrorActionPreference = "Stop"

Write-Host "=== Atualizando repositório GitHub ===" -ForegroundColor Cyan

# 1. Verifica se já é um repositório git
if (-not (Test-Path ".git")) {
    Write-Host "Inicializando repositório git..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "Repositório git já inicializado." -ForegroundColor Green
}

# 2. Adiciona todos os arquivos e cria commit
Write-Host "Adicionando arquivos e criando commit..." -ForegroundColor Yellow
git add .
git commit -m "Meus arquivos locais" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Nada para commitar ou commit já existe. Continuando..." -ForegroundColor Cyan
}

# 3. Configura o remote (apenas se não existir)
$remoteExists = git remote | Select-String "origin"
if (-not $remoteExists) {
    Write-Host "Adicionando remote origin..." -ForegroundColor Yellow
    git remote add origin https://github.com/nullmssbackup-oss/scale.git
} else {
    Write-Host "Remote origin já configurado." -ForegroundColor Green
}

# 4. Garante que a branch é main
Write-Host "Renomeando branch para main..." -ForegroundColor Yellow
git branch -M main

# 5. Atualiza com o repositório remoto (pull com rebase)
Write-Host "Atualizando com o repositório remoto..." -ForegroundColor Yellow
git pull origin main --rebase

# 6. Envia as alterações
Write-Host "Enviando para o GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "`n=== Atualização concluída! ===" -ForegroundColor Green