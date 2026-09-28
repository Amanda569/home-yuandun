param(
  [Parameter(Position = 0)]
  [string]$Message = "Update site"
)

$ErrorActionPreference = "Stop"

$git = (Get-Command git -ErrorAction Stop).Source

& $git add .
if ($LASTEXITCODE -ne 0) {
  throw "git add failed"
}

& $git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
  Write-Host "No new file changes. Trying push for existing commits..."
} else {
  & $git commit -m $Message
  if ($LASTEXITCODE -ne 0) {
    throw "git commit failed"
  }
}

& $git push origin main
if ($LASTEXITCODE -ne 0) {
  throw "git push failed"
}
