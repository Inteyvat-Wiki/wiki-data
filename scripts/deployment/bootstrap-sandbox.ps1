param(
    [ValidateSet('Bootstrap', 'Expand')][string]$Mode = 'Bootstrap',
    [string]$Archive,
    [string]$Destination,
    [switch]$Merge
)
# Uses only the Windows-provided PowerShell 5.1 and .NET Framework until pinned Node is installed.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$inputRoot = 'C:\InteyvatInput'
$outputRoot = 'C:\InteyvatOutput'
$workRoot = 'C:\InteyvatSandbox'

function Expand-CheckedZip([string]$ZipFile, [string]$Target, [bool]$AllowMerge) {
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $targetFull = [IO.Path]::GetFullPath($Target).TrimEnd('\') + '\'
    if (-not $targetFull.StartsWith($workRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'ZIP target must be within the private guest work directory' }
    if ((Test-Path -LiteralPath $Target) -and -not $AllowMerge) { throw 'ZIP target already exists' }
    $zip = [IO.Compression.ZipFile]::OpenRead($ZipFile)
    try {
        $seen = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
        $total = [long]0
        # Validate the entire directory before writing any entry.
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('\', '/').TrimEnd('/')
            if (-not $name -or $name -match '[:<>"|?*\x00-\x1f]' -or $name.StartsWith('/')) { throw 'Unsafe ZIP entry' }
            foreach ($part in $name.Split('/')) {
                if (-not $part -or $part -eq '.' -or $part -eq '..' -or $part -match '[. ]$' -or $part -match '^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])(\.|$)') { throw 'Unsafe ZIP path component' }
            }
            if ((($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'ZIP symlinks are forbidden' }
            $entryPath = [IO.Path]::GetFullPath([IO.Path]::Combine($Target, $name))
            if (-not $entryPath.StartsWith($targetFull, [StringComparison]::OrdinalIgnoreCase)) { throw 'ZIP path escaped target' }
            if (-not $seen.Add($entryPath)) { throw 'Duplicate ZIP path' }
            $total += $entry.Length
            if ($total -gt 8589934592) { throw 'ZIP exceeds 8 GiB unpacked limit' }
        }
        [IO.Directory]::CreateDirectory($Target) | Out-Null
        foreach ($entry in $zip.Entries) {
            $entryPath = [IO.Path]::Combine($Target, $entry.FullName.Replace('/', '\'))
            if ($entry.FullName.EndsWith('/')) { [IO.Directory]::CreateDirectory($entryPath) | Out-Null; continue }
            [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($entryPath)) | Out-Null
            [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $entryPath, $AllowMerge)
        }
    } finally { $zip.Dispose() }
}

$run = Get-Content -LiteralPath "$inputRoot\run.json" -Raw | ConvertFrom-Json
$execution = Get-Content -LiteralPath "$outputRoot\execution.json" -Raw | ConvertFrom-Json
if ($execution.id -ne $run.id) { throw 'Not a prepared sandbox execution' }
if ($Mode -eq 'Expand') {
    Expand-CheckedZip $Archive $Destination $Merge.IsPresent
    exit 0
}

[IO.Directory]::CreateDirectory("$outputRoot\logs") | Out-Null
Start-Transcript -LiteralPath "$outputRoot\logs\bootstrap.log" | Out-Null
try {
    if (Test-Path -LiteralPath $workRoot) { throw 'Guest work directory exists; use a fresh sandbox' }
    $lockHash = (Get-FileHash -LiteralPath "$inputRoot\lock.json" -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($lockHash -ne $run.lockSha256) { throw 'Deployment lock changed' }
    foreach ($property in $run.bootstrapHashes.PSObject.Properties) {
        if ($property.Name -notmatch '^[a-z-]+\.(cjs|ps1)$') { throw 'Invalid bootstrap filename' }
        $actual = (Get-FileHash -LiteralPath "$inputRoot\$($property.Name)" -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actual -ne $property.Value) { throw 'Bootstrap integrity mismatch' }
    }
    $lock = Get-Content -LiteralPath "$inputRoot\lock.json" -Raw | ConvertFrom-Json
    $node = $lock.tools.node
    if ($node.version -ne '24.22.2' -or $node.url -ne 'https://nodejs.org/dist/v24.22.2/node-v24.22.2-win-x64.zip' -or $node.root -ne 'node-v24.22.2-win-x64' -or $node.sha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid pinned Node input' }
    [IO.Directory]::CreateDirectory("$workRoot\downloads") | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri $node.url -OutFile "$workRoot\downloads\node.zip" -TimeoutSec 600
    if ((Get-FileHash -LiteralPath "$workRoot\downloads\node.zip" -Algorithm SHA256).Hash.ToLowerInvariant() -ne $node.sha256) { throw 'Node archive hash mismatch' }
    Expand-CheckedZip "$workRoot\downloads\node.zip" "$workRoot\tools\node" $false
    $nodeExe = "$workRoot\tools\node\$($node.root)\node.exe"
    $env:INTEYVAT_SANDBOX_RUN = $run.id
    $process = Start-Process -FilePath $nodeExe -ArgumentList "$inputRoot\sandbox-guest.cjs" -WorkingDirectory $workRoot -WindowStyle Hidden -PassThru -Wait `
        -RedirectStandardOutput "$outputRoot\logs\guest.stdout.log" -RedirectStandardError "$outputRoot\logs\guest.stderr.log"
    if ($process.ExitCode -ne 0) { throw "Guest deployment failed ($($process.ExitCode)); inspect guest logs" }
    if (-not (Test-Path -LiteralPath "$outputRoot\result.json")) { throw 'Guest did not produce a result' }
} catch {
    if (-not (Test-Path -LiteralPath "$outputRoot\result.json")) {
        @{schema=1; id=$run.id; lockSha256=$run.lockSha256; status='failed'; phase='bootstrap'; error=$_.Exception.Message} |
            ConvertTo-Json -Depth 8 | Set-Content -LiteralPath "$outputRoot\result.json" -Encoding UTF8
    }
    Write-Output $_.Exception.Message
    exit 1
} finally { Stop-Transcript | Out-Null }
