$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskPackageRoot = (Resolve-Path -LiteralPath 'release/ChessWorkshop-1.0.0').Path
$taskArchivePath = (Resolve-Path -LiteralPath 'release/ChessWorkshop-1.0.0-Windows.zip').Path
$taskArchive = [IO.Compression.ZipFile]::OpenRead($taskArchivePath)
$taskSha = [Security.Cryptography.SHA256]::Create()
try {
    $taskFiles = @{}
    foreach ($taskEntry in $taskArchive.Entries) {
        $taskName = $taskEntry.FullName.Replace('\', '/')
        if ($taskName.EndsWith('/')) { continue }
        if (!$taskName.StartsWith('ChessWorkshop-1.0.0/')) { throw "Unexpected archive path: $taskName" }
        $taskRelative = $taskName.Substring('ChessWorkshop-1.0.0/'.Length)
        if ($taskFiles.ContainsKey($taskRelative)) { throw "Duplicate entry: $taskRelative" }
        $taskFiles[$taskRelative] = $taskEntry
    }
    $taskManifestBytes = [IO.File]::ReadAllBytes((Join-Path $taskPackageRoot 'SHA256-MANIFEST.json'))
    $taskManifestHash = [Convert]::ToHexString($taskSha.ComputeHash($taskManifestBytes)).ToLowerInvariant()
    $taskStream = $taskFiles['SHA256-MANIFEST.json'].Open()
    try { $taskEmbeddedHash = [Convert]::ToHexString($taskSha.ComputeHash($taskStream)).ToLowerInvariant() } finally { $taskStream.Dispose() }
    if ($taskManifestHash -ne $taskEmbeddedHash) { throw 'Embedded manifest differs from assembled package' }
    $taskManifest = [Text.Encoding]::UTF8.GetString($taskManifestBytes) | ConvertFrom-Json
    if ($taskFiles.Count -ne $taskManifest.Count + 1) { throw 'Unexpected archive file count' }
    foreach ($taskFile in $taskManifest) {
        $taskEntry = $taskFiles[$taskFile.path]
        if (!$taskEntry -or $taskEntry.Length -ne $taskFile.bytes) { throw "Missing or changed size: $($taskFile.path)" }
        $taskStream = $taskEntry.Open()
        try { $taskHash = [Convert]::ToHexString($taskSha.ComputeHash($taskStream)).ToLowerInvariant() } finally { $taskStream.Dispose() }
        if ($taskHash -ne $taskFile.sha256) { throw "Archive hash mismatch: $($taskFile.path)" }
    }
} finally { $taskSha.Dispose(); $taskArchive.Dispose() }
$taskSmoke = Get-Content -LiteralPath (Join-Path $taskPackageRoot 'docs/evidence/package.json') -Raw | ConvertFrom-Json
$taskSummary = Get-Content -LiteralPath (Join-Path $taskPackageRoot 'docs/evidence/summary.json') -Raw | ConvertFrom-Json
$taskIndexHash = (Get-FileHash -LiteralPath (Join-Path $taskPackageRoot 'dist/index.html') -Algorithm SHA256).Hash.ToLowerInvariant()
if (!$taskSmoke.passed -or $taskSmoke.packagedIndexSha256 -ne $taskIndexHash) { throw 'Packaged runtime smoke does not match the archive build' }
$taskZipHash = (Get-FileHash -LiteralPath $taskArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$taskReport = [ordered]@{date=[DateTime]::UtcNow.ToString('o');passed=$true;scope='Archive integrity and packaged runtime smoke';manifestFilesVerified=$taskManifest.Count;archiveFiles=$taskFiles.Count;archiveBytes=(Get-Item -LiteralPath $taskArchivePath).Length;archiveSha256=$taskZipHash;packagedIndexSha256=$taskIndexHash;runtimeSmokePassed=$taskSmoke.passed;releaseStatus=$taskSummary.releaseStatus;openFindings=@($taskSummary.remainingRequirements)}
Set-Content -LiteralPath ($taskArchivePath+'.sha256') -Value ($taskZipHash+'  '+[IO.Path]::GetFileName($taskArchivePath)) -Encoding utf8
$taskJson = $taskReport | ConvertTo-Json -Depth 8
Set-Content -LiteralPath ($taskArchivePath+'.verification.json') -Value $taskJson -Encoding utf8
Set-Content -LiteralPath 'release/ChessWorkshop-1.0.0-Windows.verification.json' -Value $taskJson -Encoding utf8
$taskJson
