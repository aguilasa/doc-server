<#
.SYNOPSIS
    Roda `npm run install:local` em todas as versoes de Node disponiveis.

.DESCRIPTION
    Porte Windows de scripts/install-all-nodes.sh.

    O script bash assume mise em um caminho fixo do Linux. Aqui o gerenciador e
    detectado em tempo de execucao (mise, fnm, volta, nvm-windows) e, se nenhum
    existir, cai para o Node do sistema e roda uma unica vez.

.PARAMETER Manager
    auto (padrao), mise, fnm, volta, nvm ou system.

.PARAMETER Versions
    Lista explicita de versoes, ignorando a deteccao do gerenciador.

.PARAMETER Script
    Nome do script npm a executar. Padrao: install:local.

.EXAMPLE
    .\scripts\install-all-nodes.ps1

.EXAMPLE
    .\scripts\install-all-nodes.ps1 -Versions 20.11.0, 22.1.0

.EXAMPLE
    .\scripts\install-all-nodes.ps1 -Manager fnm -Script build
#>
[CmdletBinding()]
param(
    [ValidateSet('auto', 'mise', 'fnm', 'volta', 'nvm', 'system')]
    [string] $Manager = 'auto',

    [string[]] $Versions,

    [string] $Script = 'install:local'
)

$ErrorActionPreference = 'Stop'

$ProjectDir = Split-Path -Parent $PSScriptRoot

# npm.cmd, nao npm: os gerenciadores fazem exec de um processo nativo e nao
# resolvem o npm.ps1 do PowerShell.
$Npm = 'npm.cmd'

function Find-Tool {
    param([string] $Name, [string[]] $ExtraPaths = @())

    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    foreach ($p in $ExtraPaths) {
        if ($p -and (Test-Path $p)) { return $p }
    }
    return $null
}

function Get-MisePath {
    Find-Tool 'mise' @(
        "$env:USERPROFILE\.local\bin\mise.exe",
        "$env:LOCALAPPDATA\Microsoft\WinGet\Links\mise.exe",
        "$env:USERPROFILE\scoop\shims\mise.exe"
    )
}

function Get-FnmPath {
    Find-Tool 'fnm' @(
        "$env:LOCALAPPDATA\fnm\fnm.exe",
        "$env:USERPROFILE\scoop\shims\fnm.exe"
    )
}

function Get-VoltaPath {
    Find-Tool 'volta' @("$env:LOCALAPPDATA\Volta\bin\volta.exe")
}

function Get-NvmPath {
    Find-Tool 'nvm' @("$env:APPDATA\nvm\nvm.exe")
}

# --- deteccao do gerenciador -------------------------------------------------

$ManagerPath = $null

if ($Manager -eq 'auto') {
    $candidates = @(
        @{ Name = 'mise';  Path = (Get-MisePath) },
        @{ Name = 'fnm';   Path = (Get-FnmPath) },
        @{ Name = 'volta'; Path = (Get-VoltaPath) },
        @{ Name = 'nvm';   Path = (Get-NvmPath) }
    )
    foreach ($c in $candidates) {
        if ($c.Path) {
            $Manager = $c.Name
            $ManagerPath = $c.Path
            break
        }
    }
    if ($Manager -eq 'auto') { $Manager = 'system' }
}
elseif ($Manager -ne 'system') {
    switch ($Manager) {
        'mise'  { $ManagerPath = Get-MisePath }
        'fnm'   { $ManagerPath = Get-FnmPath }
        'volta' { $ManagerPath = Get-VoltaPath }
        'nvm'   { $ManagerPath = Get-NvmPath }
    }
    if (-not $ManagerPath) {
        Write-Error "Gerenciador '$Manager' pedido mas nao encontrado no PATH nem nos caminhos conhecidos."
        exit 1
    }
}

# --- descoberta das versoes --------------------------------------------------

function Get-InstalledVersions {
    param([string] $Kind, [string] $Path)

    switch ($Kind) {
        'mise' {
            $out = & $Path list node 2>$null
            return @($out | ForEach-Object {
                if ($_ -match '^\s*node\s+(\S+)') { $matches[1] }
            })
        }
        'fnm' {
            $out = & $Path list 2>$null
            return @($out | ForEach-Object {
                if ($_ -match 'v(\d+\.\d+\.\d+)') { $matches[1] }
            })
        }
        'volta' {
            $out = & $Path list node --format plain 2>$null
            return @($out | ForEach-Object {
                if ($_ -match 'node@(\S+)') { $matches[1] }
            })
        }
        'nvm' {
            $out = & $Path list 2>$null
            return @($out | ForEach-Object {
                if ($_ -match '(\d+\.\d+\.\d+)') { $matches[1] }
            })
        }
    }
    return @()
}

if ($Versions -and $Versions.Count -gt 0) {
    if ($Manager -eq 'system') {
        Write-Error "-Versions exige um gerenciador (mise/fnm/volta/nvm); nenhum foi encontrado. Sem ele nao ha como trocar de Node e o mesmo binario rodaria repetido."
        exit 1
    }
    $VersionList = @($Versions)
    Write-Host "Gerenciador: $Manager ($ManagerPath)"
    Write-Host "Versoes informadas manualmente: $($VersionList -join ', ')"
}
elseif ($Manager -eq 'system') {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) {
        Write-Error "Nenhum gerenciador de versao (mise/fnm/volta/nvm) e nenhum Node no PATH."
        exit 1
    }
    $current = (& node -v).TrimStart('v')
    Write-Host "Nenhum gerenciador de versao encontrado."
    Write-Host "Usando o Node do sistema: v$current ($($node.Source))"
    $VersionList = @($current)
}
else {
    $VersionList = @(Get-InstalledVersions -Kind $Manager -Path $ManagerPath | Select-Object -Unique)
    if ($VersionList.Count -eq 0) {
        Write-Error "Nenhuma versao do Node encontrada via $Manager."
        exit 1
    }
    Write-Host "Gerenciador: $Manager ($ManagerPath)"
    Write-Host "Versoes encontradas: $($VersionList -join ', ')"
}

Write-Host ''

# --- execucao ----------------------------------------------------------------

function Invoke-NpmForVersion {
    param([string] $Version)

    switch ($Manager) {
        'mise'   { & $ManagerPath exec "node@$Version" -- $Npm run $Script }
        'fnm'    { & $ManagerPath exec --using $Version $Npm run $Script }
        'volta'  { & $ManagerPath run --node $Version $Npm run $Script }
        'nvm'    { & $ManagerPath use $Version | Out-Host; & $Npm run $Script }
        'system' { & $Npm run $Script }
    }
}

# nvm-windows troca a versao ativa globalmente (nao tem `exec`), entao guarda a
# versao corrente para restaurar no fim.
$OriginalNvmVersion = $null
if ($Manager -eq 'nvm') {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) { $OriginalNvmVersion = (& node -v).TrimStart('v') }
    Write-Warning "nvm-windows troca a versao ativa do sistema durante a execucao."
}

$Failed = @()

Push-Location $ProjectDir
try {
    foreach ($version in $VersionList) {
        Write-Host '------------------------------------------'
        Write-Host "Node $version"
        Write-Host '------------------------------------------'

        # A saida do npm precisa fluir para o console, entao a funcao e chamada
        # como statement e o codigo de saida lido depois via $LASTEXITCODE.
        $global:LASTEXITCODE = 0
        $code = 1
        try {
            Invoke-NpmForVersion -Version $version
            $code = $LASTEXITCODE
        }
        catch {
            Write-Host $_.Exception.Message
            $code = 1
        }

        if ($code -eq 0) {
            Write-Host "[OK] Node $version"
        }
        else {
            Write-Host "[FALHOU] Node $version (exit $code)"
            $Failed += $version
        }
        Write-Host ''
    }
}
finally {
    Pop-Location
    if ($Manager -eq 'nvm' -and $OriginalNvmVersion) {
        & $ManagerPath use $OriginalNvmVersion | Out-Host
    }
}

Write-Host '=========================================='
if ($Failed.Count -eq 0) {
    Write-Host 'Instalacao concluida em todas as versoes.'
    exit 0
}
else {
    Write-Host "Falhou em: $($Failed -join ', ')"
    exit 1
}
