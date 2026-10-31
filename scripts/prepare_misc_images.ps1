param(
    [string]$Studio = 'C:/Apps/AnimeStudio',
    [string]$Map = 'C:/Apps/AnimeStudio/Maps/genshin_7.1.map',
    [Parameter(Mandatory=$true)][string]$WorkDirectory,
    [switch]$CheckCli,
    [switch]$SelfTest
)
# Preparation only: never launches extraction, changes game inputs, or updates data.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$project = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $project 'data/common/misc/assets.json'
$utf8 = [Text.UTF8Encoding]::new($false)
$WorkDirectory = [IO.Path]::GetFullPath($WorkDirectory)
if (!(Test-Path -LiteralPath $WorkDirectory)) { [void][IO.Directory]::CreateDirectory($WorkDirectory) }

function Get-MiscImageName([object]$Value) {
    if ($Value -isnot [string] -or [string]::IsNullOrWhiteSpace($Value)) {
        return @{ name = ''; reason = 'invalid_name' }
    }
    $name = ($Value.Replace('\', '/') -split '/')[-1] -replace '\.(png|tga|jpg|jpeg)$', ''
    if ($name -match '^\d+$' -or $name -match '^(?:0x[0-9a-f]+|[0-9a-f]{16})$') {
        return @{ name = $name; reason = 'numeric_or_hash_not_resolved' }
    }
    if (!$name -or $name -match '[<>:"/\\|?*\x00-\x1f]' -or $name -match '[. ]$' -or
        $name.Length -gt 180 -or $name -match '^(?i:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)') {
        return @{ name = $name; reason = 'unsafe_filename' }
    }
    return @{ name = $name; reason = '' }
}

function Select-MiscImageEntries([object[]]$Candidates) {
    $sprites = @($Candidates | Where-Object { [int]$_.Type -eq 213 })
    if ($sprites.Count) { return $sprites }
    return @($Candidates | Where-Object { [int]$_.Type -eq 28 })
}

function Write-MiscJson([string]$File, [object]$Value) {
    $stream = [IO.File]::Open($File, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    $writer = [IO.StreamWriter]::new($stream, $utf8)
    try { $writer.WriteLine(($Value | ConvertTo-Json -Depth 10)) } finally { $writer.Dispose() }
}

function Write-MiscXml([string]$File, [object[]]$Entries) {
    # This installed CLI's forward-only XML parser needs whitespace between fields.
    # Compact XML can fail despite exit code 0; verified with the synthetic CLI test.
    $settings = [Xml.XmlWriterSettings]::new()
    $settings.Indent = $true
    $settings.Encoding = $utf8
    $stream = [IO.File]::Open($File, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    $writer = [Xml.XmlWriter]::Create($stream, $settings)
    try {
        $writer.WriteStartDocument()
        $writer.WriteStartElement('Assets')
        foreach ($entry in $Entries) {
            $writer.WriteStartElement('Asset')
            foreach ($field in @('Name', 'Container', 'Type', 'PathID', 'Source')) {
                $writer.WriteElementString($field, [string]$entry.$field)
            }
            $writer.WriteEndElement()
        }
        $writer.WriteEndElement()
        $writer.WriteEndDocument()
    } finally { $writer.Dispose(); $stream.Dispose() }
}

if ($SelfTest) {
    foreach ($value in @('12345678901234567890', 'folder/123.png', '0x1234', 'abcdef0123456789')) {
        if ((Get-MiscImageName $value).reason -ne 'numeric_or_hash_not_resolved') { throw "Hash guard failed: $value" }
    }
    if ((Get-MiscImageName 'folder\UI_Exact.png').name -cne 'UI_Exact') { throw 'Name normalization failed' }
    if (!(Get-MiscImageName 'UI_Exact?.png').reason) { throw 'Unsafe name accepted' }
    $chosen = @(Select-MiscImageEntries @(@{ Type = 28 }, @{ Type = 213 }))
    if ($chosen.Count -ne 1 -or $chosen[0].Type -ne 213) { throw 'Sprite priority failed' }
    'misc preparation self-test: passed (no map or manifest loaded)'
    return
}
if ($CheckCli) {
    & (Join-Path $Studio 'AnimeStudio.CLI.exe') --help | ForEach-Object { $_ -replace ' {3,}', '  ' }
    if ($LASTEXITCODE -ne 0) { throw 'AnimeStudio CLI help failed' }
    return
}
if (!(Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    [ordered]@{ status = 'awaiting_manifest'; manifest = $manifestPath; extraction_started = $false } | ConvertTo-Json
    return
}
$reportPath = Join-Path $WorkDirectory 'misc-images-match-report.json'
$planPath = Join-Path $WorkDirectory 'misc-images-extract-plan.json'
foreach ($file in @($reportPath, $planPath)) {
    if (Test-Path -LiteralPath $file) { throw "Preparation output already exists; preserve/review it before another run: $file" }
}
$manifestHash = (Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant()
$manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json -NoEnumerate
if ($manifest -isnot [array]) { throw 'misc manifest must be an array' }
$requests = [Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
$diagnostics = [Collections.Generic.List[object]]::new()
$missingCount = 0
foreach ($asset in $manifest) {
    if ($asset.category -cne 'misc' -or $asset.id -isnot [string] -or
        $asset.id -notmatch '^[a-z0-9_-]+$' -or $asset.available -isnot [bool]) {
        throw 'Invalid misc manifest entry (category/id/available)'
    }
    $missingCount++
    $parsed = Get-MiscImageName $asset.name
    if ($parsed.reason) {
        $diagnostics.Add(@{ id = $asset.id; reference = $asset.name; reason = $parsed.reason })
        continue
    }
    if (!$requests.ContainsKey($parsed.name)) {
        $requests.Add($parsed.name, [Collections.Generic.List[object]]::new())
    }
    $requests[$parsed.name].Add(@{ id = $asset.id; reference = $asset.name })
}
# Re-extract every referenced name, including already imported small variants.
$wanted = [Collections.Generic.Dictionary[string,object]]::new([StringComparer]::Ordinal)
foreach ($name in $requests.Keys) { $wanted.Add($name, [Collections.Generic.List[object]]::new()) }
if ($wanted.Count) {
    foreach ($dll in @('MessagePack.Annotations.dll', 'MessagePack.dll', 'Newtonsoft.Json.dll', 'AnimeStudio.dll')) {
        [void][Reflection.Assembly]::LoadFrom((Join-Path $Studio "bin/$dll"))
    }
    if ([AnimeStudio.ResourceMap]::FromFile($Map) -ne 1) { throw 'Asset map load failed' }
    # A single read-only pass over the map, retaining only explicitly requested names.
    foreach ($entry in [AnimeStudio.ResourceMap]::GetEntries()) {
        if ([int]$entry.Type -in 28,213 -and $wanted.ContainsKey($entry.Name)) {
            $wanted[$entry.Name].Add($entry)
        }
    }
}
$selected = [Collections.Generic.List[object]]::new()
$buckets = @{ Sprite = [Collections.Generic.List[object]]::new(); Texture2D = [Collections.Generic.List[object]]::new() }
foreach ($name in @($wanted.Keys | Sort-Object -CaseSensitive)) {
    $entries = @(Select-MiscImageEntries @($wanted[$name]))
    if (!$entries.Count) {
        $diagnostics.Add(@{ name = $name; reason = 'no_exact_Texture2D_or_Sprite'; references = @($requests[$name]) })
        continue
    }
    $kind = if ([int]$entries[0].Type -eq 213) { 'Sprite' } else { 'Texture2D' }
    $selected.Add(@{ name = $name; kind = $kind; entries = $entries.Count })
    $buckets[$kind].Add(@{ name = $name; entries = $entries })
}
# No game writes by CLI split merging: reject source folders with split pieces.
$sourceDirs = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$sourceFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
$sourceBytes = [long]0
foreach ($kind in @('Sprite', 'Texture2D')) {
    foreach ($group in $buckets[$kind]) { foreach ($entry in $group.entries) {
        if (!(Test-Path -LiteralPath $entry.Source -PathType Leaf)) { throw "Selected source missing: $($entry.Source)" }
        if ($sourceFiles.Add($entry.Source)) { $sourceBytes += (Get-Item -LiteralPath $entry.Source).Length }
        [void]$sourceDirs.Add([IO.Path]::GetDirectoryName($entry.Source))
    } }
}
foreach ($directory in $sourceDirs) {
    if (@([IO.Directory]::EnumerateFiles($directory, '*.split*', [IO.SearchOption]::TopDirectoryOnly)).Count) {
        throw "Refuse CLI plan: source folder contains split pieces that CLI might merge: $directory"
    }
}
$commands = [Collections.Generic.List[object]]::new()
foreach ($kind in @('Sprite', 'Texture2D')) {
    $groups = @($buckets[$kind])
    $cursor = 0; $batch = 0
    while ($cursor -lt $groups.Count) {
        $batch++
        $batchEntries = [Collections.Generic.List[object]]::new()
        $patterns = [Collections.Generic.List[string]]::new()
        $regexLength = 0
        while ($cursor -lt $groups.Count) {
            $escaped = [regex]::Escape($groups[$cursor].name)
            if ($patterns.Count -and $regexLength + $escaped.Length + 1 -gt 6000) { break }
            $patterns.Add($escaped); $regexLength += $escaped.Length + 1
            foreach ($entry in $groups[$cursor].entries) { $batchEntries.Add($entry) }
            $cursor++
        }
        $label = '{0}-{1:0000}' -f $kind.ToLowerInvariant(), $batch
        $xml = Join-Path $WorkDirectory "misc-images-selected-$label.xml"
        $subdir = if ($kind -eq 'Sprite') { 'misc-images-sprites-7.1' } else { 'misc-images-textures-7.1' }
        $destination = Join-Path (Join-Path $WorkDirectory $subdir) ('batch-{0:0000}' -f $batch)
        if (Test-Path -LiteralPath $destination) { throw "Extraction folder already exists: $destination" }
        Write-MiscXml $xml @($batchEntries)
        $types = if ($kind -eq 'Sprite') { @('Texture2D:Parse', 'Sprite:Both') } else { @('Texture2D:Both', 'Sprite:Parse') }
        $arguments = @($xml, $destination, '--game', 'GI', '--map_op', 'Load,AssetMap', '--map_type', 'XML',
            '--map_name', $xml, '--types') + $types + @('--names', ('\A(?:' + ($patterns -join '|') + ')\z'),
            '--group_assets', 'BySource', '--export_type', 'Convert')
        $commands.Add(@{ kind = $kind; selected_xml = $xml; output = $destination;
            executable = (Join-Path $Studio 'AnimeStudio.CLI.exe'); arguments = $arguments;
            names = $patterns.Count; map_entries = $batchEntries.Count })
    }
}
if ((Get-FileHash -LiteralPath $manifestPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $manifestHash) {
    throw 'Manifest changed during preparation; do not use the partial XML files'
}
$summary = [ordered]@{ status = 'prepared_only'; missing_references = $missingCount;
    requested_unique_names = $requests.Count; selected_unique_names = $selected.Count;
    selected_map_entries = ($commands | Measure-Object -Property map_entries -Sum).Sum;
    source_files = $sourceFiles.Count; source_bytes = $sourceBytes;
    cli_batches = $commands.Count; extraction_started = $false }
Write-MiscJson $planPath @{ schema = 1; manifest_sha256 = $manifestHash; commands = @($commands); auto_execute = $false }
Write-MiscJson $reportPath @{ schema = 1; manifest = $manifestPath; manifest_sha256 = $manifestHash;
    map = $Map; summary = $summary; selected_names = @($selected); diagnostics = @($diagnostics) }
$summary | ConvertTo-Json
