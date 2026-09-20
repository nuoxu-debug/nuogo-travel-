$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security

$ready = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.docx'
$aligned = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.docx'
$unified = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_UNIFIED.docx'
$pdf = Join-Path $env:TEMP 'Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.pdf'
$expectedAlignedHash = '8B13CC0C9A0362A3736F6AD376EE06884E2622BE5A8E1B63D5A75F9448D19370'
$expectedUnifiedHash = '9345C3AA668E4F07A1D129F99842E22A5C3700C5FEDE6274ADA5AEC36E9A4AC4'

function Get-SharedHash([string]$path) {
  $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') } finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($ready)
try {
  function Read-ZipText([string]$name) {
    $entry = $zip.GetEntry($name)
    if (-not $entry) { throw "Missing package entry: $name" }
    $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  }

  $xml = New-Object System.Xml.XmlDocument
  $xml.PreserveWhitespace = $true
  $xml.LoadXml((Read-ZipText 'word/document.xml'))
  $rels = New-Object System.Xml.XmlDocument
  $rels.LoadXml((Read-ZipText 'word/_rels/document.xml.rels'))
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
  $ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

  function Node-Text([System.Xml.XmlNode]$node) { return (($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') }
  $paragraphs = @($xml.SelectNodes('//w:body/w:p', $ns))
  $paragraphTexts = @($paragraphs | ForEach-Object { Node-Text $_ })
  $tables = @($xml.SelectNodes('//w:body/w:tbl', $ns))
  $images = @($xml.SelectNodes('//a:blip', $ns))
  $allText = (($xml.SelectNodes('//w:t', $ns) | ForEach-Object { $_.InnerText }) -join "`n")

  $figureCaptions = @()
  foreach ($paragraph in $paragraphs) {
    $text = Node-Text $paragraph
    if ($text -notmatch '^Figure [123]\.\d+ ') { continue }
    $previous = $paragraph.PreviousSibling
    while ($previous -and $previous.NodeType -ne [System.Xml.XmlNodeType]::Element) { $previous = $previous.PreviousSibling }
    if ($previous -and $previous.SelectSingleNode('.//a:blip', $ns)) { $figureCaptions += $text }
  }
  $tableCaptions = @()
  foreach ($paragraph in $paragraphs) {
    $text = Node-Text $paragraph
    if ($text -notmatch '^Table [123]\.\d+ ') { continue }
    $next = $paragraph.NextSibling
    while ($next -and $next.NodeType -ne [System.Xml.XmlNodeType]::Element) { $next = $next.NextSibling }
    if ($next -and $next.LocalName -eq 'tbl') { $tableCaptions += $text }
  }

  $expectedFigures = @('Figure 2.1') + (1..18 | ForEach-Object { "Figure 3.$_" })
  $figureNumbers = @($figureCaptions | ForEach-Object { if ($_ -match '^(Figure [123]\.\d+)') { $Matches[1] } })
  $tableNumbers = @($tableCaptions | ForEach-Object { if ($_ -match '^(Table [123]\.\d+)') { $Matches[1] } })
  $missingFigures = @($expectedFigures | Where-Object { $_ -notin $figureNumbers })
  $duplicateFigures = @($figureNumbers | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
  $duplicateTables = @($tableNumbers | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)

  $relationshipMap = @{}
  foreach ($relationship in $rels.DocumentElement.ChildNodes) { $relationshipMap[$relationship.Id] = $relationship.Target }
  $brokenImages = @()
  foreach ($blip in $images) {
    $rid = $blip.GetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $target = $relationshipMap[$rid]
    $entry = if ($target) { $zip.GetEntry('word/' + $target) } else { $null }
    if (-not $target -or -not $entry -or $entry.Length -eq 0) { $brokenImages += "${rid}:${target}" }
  }

  $expectedCaptions = @(
    'Figure 3.15 Nuogo Destination Discovery and Attraction Map InterfaceSource: Developed by the author.',
    'Figure 3.16 Nuogo Travel Preference and Travel Style Configuration InterfaceSource: Developed by the author.',
    'Figure 3.17 Nuogo Authorised Maintenance InterfaceSource: Developed by the author.',
    'Figure 3.18 Nuogo English Localization InterfaceSource: Developed by the author.'
  )
  $captionPresence = @($expectedCaptions | ForEach-Object { "$_=" + ($_ -in $paragraphTexts) })

  Write-Output ('PACKAGE_PARAGRAPHS=' + $paragraphs.Count)
  Write-Output ('PACKAGE_TABLES=' + $tables.Count)
  Write-Output ('PACKAGE_IMAGES=' + $images.Count)
  Write-Output ('FIGURE_NUMBERS=' + ($figureNumbers -join ','))
  Write-Output ('MISSING_FIGURES=' + ($missingFigures -join ','))
  Write-Output ('DUPLICATE_FIGURES=' + ($duplicateFigures -join ','))
  Write-Output ('TABLE_NUMBERS=' + ($tableNumbers -join ','))
  Write-Output ('DUPLICATE_TABLES=' + ($duplicateTables -join ','))
  Write-Output ('BROKEN_IMAGES=' + ($brokenImages -join ','))
  Write-Output ('CAPTION_PRESENCE=' + ($captionPresence -join ';'))
  Write-Output ('MOJIBAKE_REPLACEMENT_CHARACTER=' + $allText.Contains([string][char]0xFFFD))
} finally { $zip.Dispose() }

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open($ready, $false, $false)
  foreach ($field in $doc.Fields) { try { [void]$field.Update() } catch {} }
  foreach ($toc in $doc.TablesOfContents) { [void]$toc.Update() }
  foreach ($tof in $doc.TablesOfFigures) { [void]$tof.Update() }
  $doc.Repaginate()
  $doc.Save()
  $doc.ExportAsFixedFormat($pdf, 17)
  Write-Output ('WORD_OPENS=True')
  Write-Output ('WORD_PAGES=' + $doc.ComputeStatistics(2))
  Write-Output ('WORD_PARAGRAPHS=' + $doc.Paragraphs.Count)
  Write-Output ('WORD_TABLES=' + $doc.Tables.Count)
  Write-Output ('WORD_IMAGES=' + $doc.InlineShapes.Count)
  Write-Output ('WORD_FIELDS=' + $doc.Fields.Count)
  Write-Output ('WORD_TOCS=' + $doc.TablesOfContents.Count)
  Write-Output ('WORD_LISTS_OF_FIGURES_OR_TABLES=' + $doc.TablesOfFigures.Count)
  $doc.Close($false)
  $doc = $null
} finally {
  if ($doc) { try { $doc.Close($false) } catch {} }
  try { $word.Quit() } catch {}
  try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null } catch {}
}

Write-Output ('PDF=' + $pdf)
Write-Output ('PDF_BYTES=' + (Get-Item -LiteralPath $pdf).Length)
Write-Output ('UNIFIED_UNCHANGED=' + ((Get-SharedHash $unified) -eq $expectedUnifiedHash))
Write-Output ('ALIGNED_UNCHANGED=' + ((Get-SharedHash $aligned) -eq $expectedAlignedHash))
Write-Output ('READY_SHA256=' + (Get-SharedHash $ready))
