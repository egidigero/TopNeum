<#
PowerShell helper to run the main SQL scripts against a Postgres/Neon database.
Usage:
  Set the env var NEON_NEON_DATABASE_URL or pass the connection string as parameter.

Example:
  $env:NEON_NEON_DATABASE_URL = "postgresql://user:pass@host:5432/dbname?sslmode=require"
  .\run-migrations.ps1

Or:
  .\run-migrations.ps1 -ConnectionString "postgresql://user:pass@host:5432/dbname?sslmode=require"
#>
param(
  [string]$ConnectionString = $env:NEON_NEON_DATABASE_URL
)

if (-not $ConnectionString) {
  Write-Error "No connection string provided. Set the NEON_NEON_DATABASE_URL env var or pass -ConnectionString"
  exit 1
}

# Files to run (relative to script location)
$files = @(
  "001-create-schema.sql",
  "002-create-pricing-view.sql",
  "003-seed-data.sql"
)

foreach ($file in $files) {
  $path = Join-Path $PSScriptRoot $file
  if (-not (Test-Path $path)) {
    Write-Error "Missing file: $path"
    exit 1
  }
  Write-Host "Running $file..."
  & psql $ConnectionString -f $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "psql failed on $file with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
  }
}

Write-Host "Migrations completed successfully." -ForegroundColor Green
