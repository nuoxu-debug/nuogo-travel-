$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$source = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_SUBMISSION_READY.docx'
$output = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_SUBMISSION.docx'
$w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

$originalSentence = 'LLMs are attractive for itinerary planning because they can interpret natural-language requirements and organise them into coherent day-by-day plans. At the same time, research shows that fluent LLM output is not necessarily a feasible travel plan. Travel-planning agents can struggle with multiple constraints, and exploratory LLM use can introduce factual or location errors that affect later decisions (Xie et al., 2024; Ma et al., 2023). Therefore, itinerary generation requires explicit checking rather than direct acceptance of model output.'
$finalSentence = 'LLMs are attractive for itinerary planning because they can interpret natural-language requirements and organise them into coherent day-by-day plans. At the same time, research shows that fluent LLM output does not necessarily represent a feasible or fully supported travel plan. Travel-planning agents can struggle with multiple constraints, while LLM-based recommender systems may also hallucinate unsupported or non-existent recommended items (Xie et al., 2024; Jiang et al., 2025). Therefore, itinerary generation requires explicit validation rather than direct acceptance of model output.'

function Get-Sha256Text([string] $text) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($text)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-', '') } finally { $sha.Dispose() }
}

function Read-PackageState([string] $path) {
    $zip = [IO.Compression.ZipFile]::OpenRead($path)
    try {
        $reader = New-Object IO.StreamReader($zip.GetEntry('word/document.xml').Open(), [Text.Encoding]::UTF8)
        [xml] $xml = $reader.ReadToEnd()
        $reader.Close()
        $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
        $ns.AddNamespace('w', $w)
        $tables = @($xml.SelectNodes('//w:tbl', $ns))
        $paragraphs = @($xml.SelectNodes('//w:body/w:p', $ns))
        $paragraphTexts = @($paragraphs | ForEach-Object { (($_.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') })
        $referenceIndex = [Array]::IndexOf($paragraphTexts, 'REFERENCES')
        $referenceText = if ($referenceIndex -ge 0) { ($paragraphTexts[$referenceIndex..($paragraphTexts.Count - 1)] -join "`n") } else { '' }
        return [pscustomobject]@{
            Table311Hash = Get-Sha256Text $tables[19].OuterXml
            ReferencesHash = Get-Sha256Text $referenceText
            DocumentXml = $xml
            NamespaceManager = $ns
        }
    } finally { $zip.Dispose() }
}

if (-not (Test-Path -LiteralPath $source)) { throw "Source not found: $source" }
$sourceHashBefore = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
$before = Read-PackageState $source
Copy-Item -LiteralPath $source -Destination $output -Force

$file = [IO.File]::Open($output, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($file, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $entry = $archive.GetEntry('word/document.xml')
    $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
    [xml] $xml = $reader.ReadToEnd()
    $reader.Close()
    $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('w', $w)

    $matches = @()
    foreach ($paragraph in $xml.SelectNodes('//w:p', $ns)) {
        $text = (($paragraph.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
        if ($text -eq $originalSentence) { $matches += $paragraph }
    }
    if ($matches.Count -ne 1) { throw "Expected one exact paragraph match; found $($matches.Count)." }

    $paragraph = $matches[0]
    $pPr = $paragraph.SelectSingleNode('./w:pPr', $ns)
    foreach ($child in @($paragraph.ChildNodes)) {
        if ($child -ne $pPr) { $paragraph.RemoveChild($child) | Out-Null }
    }
    $run = $xml.CreateElement('w', 'r', $w)
    $textNode = $xml.CreateElement('w', 't', $w)
    $textNode.InnerText = $finalSentence
    $run.AppendChild($textNode) | Out-Null
    $paragraph.AppendChild($run) | Out-Null

    $entry.Delete()
    $newEntry = $archive.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $xml.Save($writer)
    $writer.Close()
} finally {
    $archive.Dispose()
    $file.Dispose()
}

$after = Read-PackageState $output
$sourceHashAfter = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
if ($sourceHashAfter -ne $sourceHashBefore) { throw 'SUBMISSION_READY changed during processing.' }
if ($after.Table311Hash -ne $before.Table311Hash) { throw 'Table 3.11 changed unexpectedly.' }
if ($after.ReferencesHash -ne $before.ReferencesHash) { throw 'References section changed unexpectedly.' }

$zip = [IO.Compression.ZipFile]::OpenRead($output)
try {
    $reader = New-Object IO.StreamReader($zip.GetEntry('word/document.xml').Open(), [Text.Encoding]::UTF8)
    $documentText = $reader.ReadToEnd()
    $reader.Close()
    if ($documentText -match 'Ma et al\.\s*,?\s*\(?2023\)?') { throw 'Unresolved Ma citation remains.' }
    if (-not $documentText.Contains('Jiang et al., 2025')) { throw 'Replacement Jiang citation missing.' }
} finally { $zip.Dispose() }

Write-Output "Created: $output"
Write-Output "Source SHA256 unchanged: $sourceHashAfter"
Write-Output "Table 3.11 unchanged: $($after.Table311Hash)"
Write-Output "References unchanged: $($after.ReferencesHash)"
Write-Output "Final SHA256: $((Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash)"
