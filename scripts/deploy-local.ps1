param(
  [string]$HostName = "vps1.beweb.com.ar",
  [string]$UserName = "tastebox",
  [int]$Port = 22,
  [string]$SiteDir = "/home/tastebox/htdocs/moviebox.beweb.com.ar",
  [string]$Branch = "main",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\tastebox_deploy_ed25519",
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

foreach ($command in @("git", "ssh")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "No se encontro '$command'."
  }
}
if (-not (Test-Path $KeyPath)) { throw "No existe la llave SSH $KeyPath." }

$repoRoot = (& git rev-parse --show-toplevel).Trim()
Set-Location $repoRoot
if ((& git branch --show-current).Trim() -ne $Branch) { throw "El deploy requiere la rama $Branch." }
if (& git status --porcelain) { throw "Hay cambios locales sin commitear." }

if (-not $SkipPush) {
  & git push origin $Branch
  if ($LASTEXITCODE -ne 0) { throw "git push fallo." }
}

& ssh -i $KeyPath -p $Port -o IdentitiesOnly=yes "$UserName@$HostName" "cd '$SiteDir' && bash deploy.sh"
if ($LASTEXITCODE -ne 0) { throw "El deploy remoto fallo." }

Write-Host "MovieBox publicado en https://moviebox.beweb.com.ar"
