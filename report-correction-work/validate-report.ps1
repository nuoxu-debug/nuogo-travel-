$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security

$docx = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.docx'
$source = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_UNIFIED.docx'
$expectedSourceHash = '9345C3AA668E4F07A1D129F99842E22A5C3700C5FEDE6274ADA5AEC36E9A4AC4'

function Get-SharedHash([string]$path) {
  $stream = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try { return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '') } finally { $sha.Dispose() }
  } finally { $stream.Dispose() }
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($docx)
try {
  function Read-ZipText([string]$name) {
    $entry = $zip.GetEntry($name)
    if (-not $entry) { throw "Missing package entry: $name" }
    $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
    try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
  }

  $documentText = Read-ZipText 'word/document.xml'
  $relationshipText = Read-ZipText 'word/_rels/document.xml.rels'
  $xml = New-Object System.Xml.XmlDocument; $xml.PreserveWhitespace = $true; $xml.LoadXml($documentText)
  $rels = New-Object System.Xml.XmlDocument; $rels.LoadXml($relationshipText)
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
  $ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')

  function Node-Text([System.Xml.XmlNode]$node) { return (($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') }
  $paragraphs = @($xml.SelectNodes('//w:body/w:p', $ns))
  $tables = @($xml.SelectNodes('//w:body/w:tbl', $ns))
  $allText = (($xml.SelectNodes('//w:t', $ns) | ForEach-Object { $_.InnerText }) -join "`n")
  $paragraphTexts = @($paragraphs | ForEach-Object { Node-Text $_ })
  $tableCaptions = @()
  foreach ($paragraph in $paragraphs) {
    $text = Node-Text $paragraph
    if ($text -notmatch '^Table [123]\.\d+ ') { continue }
    $next = $paragraph.NextSibling
    while ($next -and $next.NodeType -ne [System.Xml.XmlNodeType]::Element) { $next = $next.NextSibling }
    if ($next -and $next.LocalName -eq 'tbl') { $tableCaptions += $text }
  }
  $figureCaptions = @($paragraphTexts | Where-Object { $_ -match '^Figure [123]\.\d+ ' -and $_ -notmatch 'summarises|presents|shows' })

  $expectedTables = @('Table 1.1','Table 1.2','Table 1.3','Table 1.4','Table 2.1','Table 2.2','Table 2.3','Table 2.4','Table 2.5') + (1..11 | ForEach-Object { "Table 3.$_" })
  $expectedFigures = @('Figure 2.1') + (1..14 | ForEach-Object { "Figure 3.$_" })
  $tableNumbers = @($tableCaptions | ForEach-Object { if ($_ -match '^(Table [123]\.\d+)') { $Matches[1] } })
  $figureNumbers = @($figureCaptions | ForEach-Object { if ($_ -match '^(Figure [123]\.\d+)') { $Matches[1] } })
  $missingTables = @($expectedTables | Where-Object { $_ -notin $tableNumbers })
  $missingFigures = @($expectedFigures | Where-Object { $_ -notin $figureNumbers })
  $duplicateTables = @($tableNumbers | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
  $duplicateFigures = @($figureNumbers | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)

  $headingDuplicates = @($paragraphTexts | Where-Object { $_ -eq '3.2.8.4.7 LLM Output-Quality Evaluation' }).Count
  $forbidden = @('is_must_visit','PREFERENCE_ATTRACTION','ITINERARY_DAY as a physical table','OpenRouter Prompt LoggingDisabled for Nuogo')
  $forbiddenHits = @($forbidden | Where-Object { $allText.Contains($_) })
  $mojibakeHits = @()
  if ($allText.Contains([string][char]0xFFFD)) { $mojibakeHits += 'UNICODE_REPLACEMENT_CHARACTER' }

  $caption = $paragraphs | Where-Object { (Node-Text $_) -eq 'Table 3.3 LLM Output Evaluation Metrics and Acceptance Criteria' } | Select-Object -First 1
  $nextElement = $caption.NextSibling
  while ($nextElement -and $nextElement.NodeType -ne [System.Xml.XmlNodeType]::Element) { $nextElement = $nextElement.NextSibling }
  $table33CaptionBeforeTable = $nextElement -and $nextElement.LocalName -eq 'tbl'

  $headingStyleErrors = @()
  foreach ($paragraph in $paragraphs) {
    $text = Node-Text $paragraph
    if ($text -match '^3(?:\.\d+){1,5}\s') {
      $number = $text.Split(' ')[0]
      $depth = ($number.ToCharArray() | Where-Object { $_ -eq '.' }).Count
      $expectedStyle = switch ($depth) { 1 { '3' } 2 { '4' } 3 { '5' } default { '6' } }
      $styleNode = $paragraph.SelectSingleNode('./w:pPr/w:pStyle', $ns)
      $actualStyle = if ($styleNode) { $styleNode.GetAttribute('val', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') } else { '' }
      if ($actualStyle -ne $expectedStyle) { $headingStyleErrors += "${number}:${actualStyle}->${expectedStyle}" }
    }
  }

  $relationshipMap = @{}
  foreach ($relationship in $rels.DocumentElement.ChildNodes) { $relationshipMap[$relationship.Id] = $relationship.Target }
  $brokenImages = @()
  foreach ($blip in $xml.SelectNodes('//a:blip', $ns)) {
    $rid = $blip.GetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $target = $relationshipMap[$rid]
    $entryName = 'word/' + $target
    $entry = $zip.GetEntry($entryName)
    if (-not $target -or -not $entry -or $entry.Length -eq 0) { $brokenImages += "${rid}:${target}" }
  }

  Write-Output ('PARAGRAPHS=' + $paragraphs.Count)
  Write-Output ('TABLES=' + $tables.Count)
  Write-Output ('IMAGES=' + @($xml.SelectNodes('//a:blip', $ns)).Count)
  Write-Output ('TABLE_CAPTIONS=' + ($tableNumbers -join ','))
  Write-Output ('FIGURE_CAPTIONS=' + ($figureNumbers -join ','))
  Write-Output ('MISSING_TABLES=' + ($missingTables -join ','))
  Write-Output ('MISSING_FIGURES=' + ($missingFigures -join ','))
  Write-Output ('DUPLICATE_TABLES=' + ($duplicateTables -join ','))
  Write-Output ('DUPLICATE_FIGURES=' + ($duplicateFigures -join ','))
  Write-Output ('DUPLICATE_3.2.8.4.7_COUNT=' + $headingDuplicates)
  Write-Output ('TABLE_3.3_CAPTION_BEFORE_TABLE=' + $table33CaptionBeforeTable)
  Write-Output ('HEADING_STYLE_ERRORS=' + ($headingStyleErrors -join ','))
  Write-Output ('FORBIDDEN_HITS=' + ($forbiddenHits -join ','))
  Write-Output ('MOJIBAKE_HITS=' + ($mojibakeHits -join ','))
  Write-Output ('BROKEN_IMAGES=' + ($brokenImages -join ','))
} finally { $zip.Dispose() }

$sourceHash = Get-SharedHash $source
Write-Output ('SOURCE_SHA256=' + $sourceHash)
Write-Output ('SOURCE_UNCHANGED=' + ($sourceHash -eq $expectedSourceHash))
Write-Output ('OUTPUT_SHA256=' + (Get-FileHash -LiteralPath $docx -Algorithm SHA256).Hash)
