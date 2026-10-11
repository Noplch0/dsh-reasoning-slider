<#
.SYNOPSIS
  Loads the reasoning-slider plugin into a DSH profile *without* running pnpm.

.DESCRIPTION
  Normally you install this package through DSH itself — Settings -> Plugins ->
  Add plugin, giving it this folder's path. That route makes DSH run
  `pnpm add`, record the package as a profile bundle, and apply the bundle's
  patch. Use this script only when you would rather not have pnpm touch the
  profile.

  It appends one row to the profile's cordis.patch.yml pointing straight at
  lib/index.js in this checkout, so the plugin keeps living here. That is the
  same row the bundle patch inserts, so the two routes are mutually exclusive:
  the script refuses to run once the package is a selected profile bundle.

  The patch file is backed up before every change, using the same
  `<file>.bak-<timestamp>` convention the app itself uses. Re-running is a no-op.

.PARAMETER ProfileDir
  Profile directory to install into. Defaults to $env:DSH_HOME\profiles\desktop.

.PARAMETER Remove
  Undo the installation instead: drop the patch block and leave the rest alone.
#>
[CmdletBinding()]
param(
    [string]$ProfileDir,
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$packageName = 'dsh-reasoning-slider'
$startMarker = '# >>> dsh-reasoning-slider >>>'
$endMarker = '# <<< dsh-reasoning-slider <<<'

$packageRoot = Split-Path -Parent $PSScriptRoot
$entry = Join-Path $packageRoot 'lib\index.js'
$manifest = Join-Path $packageRoot 'package.json'

if (-not (Test-Path -LiteralPath $manifest)) { throw "not a plugin package: $manifest is missing" }
if (-not (Test-Path -LiteralPath $entry)) { throw "not a plugin package: $entry is missing" }

if (-not $ProfileDir) {
    $dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME '.dsh' }
    $ProfileDir = Join-Path $dshHome 'profiles\desktop'
}
if (-not (Test-Path -LiteralPath $ProfileDir)) { throw "profile directory not found: $ProfileDir" }

$patchFile = Join-Path $ProfileDir 'cordis.patch.yml'
if (-not (Test-Path -LiteralPath $patchFile)) { throw "profile has no cordis.patch.yml: $patchFile" }

# The bundle route and this one insert the same loader row; running both would
# mount the plugin twice and the second seat registration would fail.
$profileManifestPath = Join-Path $ProfileDir 'package.json'
if (-not $Remove -and (Test-Path -LiteralPath $profileManifestPath)) {
    $profileManifest = Get-Content -LiteralPath $profileManifestPath -Raw | ConvertFrom-Json
    $selected = @($profileManifest.dsh.profile.bundles)
    if ($selected -contains $packageName) {
        throw "$packageName is already installed as a profile bundle. Remove it from Settings -> Plugins first (running both install routes at once would mount the plugin twice)."
    }
}

# The patch file is UTF-8 without BOM; read and write it the same way.
$original = [System.IO.File]::ReadAllText($patchFile, [System.Text.UTF8Encoding]::new($false))
$lines = [System.Collections.Generic.List[string]]::new()
$lines.AddRange([string[]]($original -split "`r?`n"))

# Drop any previous block of ours, so a re-run or a move of this checkout is
# reflected rather than duplicated.
$kept = [System.Collections.Generic.List[string]]::new()
$inside = $false
foreach ($line in $lines) {
    if ($line.Trim() -eq $startMarker) { $inside = $true; continue }
    if ($line.Trim() -eq $endMarker) { $inside = $false; continue }
    if (-not $inside) { $kept.Add($line) }
}

if ($Remove) {
    $updated = ($kept -join "`r`n").TrimEnd() + "`r`n"
} else {
    # A bare `insert:` list appends rows to the profile's composed entry list.
    # The absolute path is converted to a file URL beside this patch by DSH, and
    # the client bundle is found through the nearest package.json above it.
    $target = ($entry -replace '\\', '/')
    $block = @(
        $startMarker,
        '- insert:',
        '    - id: reasoning-slider',
        "      name: $target",
        $endMarker
    )
    $updated = ($kept -join "`r`n").TrimEnd() + "`r`n`r`n" + ($block -join "`r`n") + "`r`n"
}

if ($updated -eq $original) {
    Write-Host "already up to date: $patchFile"
    exit 0
}

$backup = "$patchFile.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $patchFile -Destination $backup
[System.IO.File]::WriteAllText($patchFile, $updated, [System.Text.UTF8Encoding]::new($false))

if ($Remove) {
    Write-Host "removed the reasoning-slider row from $patchFile"
} else {
    Write-Host "installed reasoning-slider into $patchFile"
    Write-Host "  plugin entry : $target"
    Write-Host "  client bundle: $(Join-Path $packageRoot 'lib\client.js')"
}
Write-Host "  backup       : $backup"
Write-Host ''
Write-Host 'Reload the DSH window. If the composer is unchanged, restart DeepSeek Harness once.'
