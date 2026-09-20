$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$source = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.docx'
$output = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.docx'
$evidence = 'C:\Users\G16\Downloads\Nuogo_Final_Report_Evidence'
$work = Join-Path $env:TEMP ('nuogo-final-ready-' + [guid]::NewGuid().ToString('N'))
$rebuilt = Join-Path $env:TEMP ('nuogo-final-ready-' + [guid]::NewGuid().ToString('N') + '.docx')

if (Test-Path -LiteralPath $output) {
  $resolved = (Resolve-Path -LiteralPath $output).Path
  if ($resolved -ne $output) { throw "Unexpected FINAL_READY target: $resolved" }
  Remove-Item -LiteralPath $output -Force
}
Copy-Item -LiteralPath $source -Destination $output
[System.IO.Compression.ZipFile]::ExtractToDirectory($output, $work)

$documentPath = Join-Path $work 'word\document.xml'
$relationshipsPath = Join-Path $work 'word\_rels\document.xml.rels'
$xml = New-Object System.Xml.XmlDocument
$xml.PreserveWhitespace = $true
$xml.Load($documentPath)
$rels = New-Object System.Xml.XmlDocument
$rels.PreserveWhitespace = $true
$rels.Load($relationshipsPath)

$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
$ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
$ns.AddNamespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
$ns.AddNamespace('pic', 'http://schemas.openxmlformats.org/drawingml/2006/picture')
$w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function Get-NodeText([System.Xml.XmlNode]$node) {
  return (($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
}

function Find-Paragraph([string]$exactText) {
  foreach ($paragraph in $xml.SelectNodes('//w:body/w:p', $ns)) {
    if ((Get-NodeText $paragraph) -eq $exactText) { return $paragraph }
  }
  throw "Paragraph not found: $exactText"
}

function Set-ParagraphText([System.Xml.XmlElement]$paragraph, [string]$text) {
  foreach ($child in @($paragraph.ChildNodes)) {
    if ($child.LocalName -ne 'pPr') { [void]$paragraph.RemoveChild($child) }
  }
  $run = $xml.CreateElement('w', 'r', $w)
  $textNode = $xml.CreateElement('w', 't', $w)
  [void]$textNode.SetAttribute('space', 'http://www.w3.org/XML/1998/namespace', 'preserve')
  $textNode.InnerText = $text
  [void]$run.AppendChild($textNode)
  [void]$paragraph.AppendChild($run)
}

function Set-ParagraphWithBreak([System.Xml.XmlElement]$paragraph, [string]$first, [string]$second) {
  foreach ($child in @($paragraph.ChildNodes)) {
    if ($child.LocalName -ne 'pPr') { [void]$paragraph.RemoveChild($child) }
  }
  $run = $xml.CreateElement('w', 'r', $w)
  $t1 = $xml.CreateElement('w', 't', $w); $t1.InnerText = $first
  $br = $xml.CreateElement('w', 'br', $w)
  $t2 = $xml.CreateElement('w', 't', $w); $t2.InnerText = $second
  [void]$run.AppendChild($t1); [void]$run.AppendChild($br); [void]$run.AppendChild($t2)
  [void]$paragraph.AppendChild($run)
}

$normalTemplate = Find-Paragraph 'The planning interface first allows the traveller to choose a supported destination. Destination discovery presents OpenTripMap-supported attractions, categories, available descriptions, and map locations. The preference form then collects essential dates, budget, traveller count, interests, preferred attractions, the selected Travel Style, and the optional rainy-day backup choice.'
$captionTemplate = Find-Paragraph 'Figure 3.14 Generated One-Itinerary WorkspaceSource: Developed by the author.'
$imageTemplate = $xml.SelectSingleNode('//w:body/w:p[.//a:blip][1]', $ns)

function New-BodyParagraph([string]$text) {
  $paragraph = $normalTemplate.CloneNode($true)
  Set-ParagraphText $paragraph $text
  return ,$paragraph
}

function New-CaptionParagraph([string]$caption) {
  $paragraph = $captionTemplate.CloneNode($true)
  Set-ParagraphWithBreak $paragraph $caption 'Source: Developed by the author.'
  return ,$paragraph
}

$relationshipNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
$ids = @($rels.DocumentElement.ChildNodes | ForEach-Object { if ($_.Id -match '^rId(\d+)$') { [int]$Matches[1] } })
$nextRelationshipId = (($ids | Measure-Object -Maximum).Maximum + 1)
$docPrIds = @($xml.SelectNodes('//wp:docPr', $ns) | ForEach-Object { [int]$_.GetAttribute('id') })
$nextDocPrId = (($docPrIds | Measure-Object -Maximum).Maximum + 1)

function Add-Image([string]$sourcePath, [string]$targetName, [double]$widthPt, [double]$heightPt, [string]$title) {
  Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $work ('word\media\' + $targetName))
  $relationshipId = 'rId' + $script:nextRelationshipId
  $script:nextRelationshipId++
  $relationship = $rels.CreateElement('Relationship', $relationshipNs)
  [void]$relationship.SetAttribute('Id', $relationshipId)
  [void]$relationship.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
  [void]$relationship.SetAttribute('Target', 'media/' + $targetName)
  [void]$rels.DocumentElement.AppendChild($relationship)

  $paragraph = $imageTemplate.CloneNode($true)
  foreach ($blip in $paragraph.SelectNodes('.//a:blip', $ns)) {
    [void]$blip.SetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', $relationshipId)
  }
  $cx = [string][math]::Round($widthPt * 12700)
  $cy = [string][math]::Round($heightPt * 12700)
  foreach ($extent in $paragraph.SelectNodes('.//wp:extent', $ns)) { [void]$extent.SetAttribute('cx', $cx); [void]$extent.SetAttribute('cy', $cy) }
  foreach ($extent in $paragraph.SelectNodes('.//a:xfrm/a:ext', $ns)) { [void]$extent.SetAttribute('cx', $cx); [void]$extent.SetAttribute('cy', $cy) }
  foreach ($docPr in $paragraph.SelectNodes('.//wp:docPr', $ns)) {
    [void]$docPr.SetAttribute('id', [string]$script:nextDocPrId)
    [void]$docPr.SetAttribute('name', "Figure $script:nextDocPrId")
    [void]$docPr.SetAttribute('descr', $title)
    $script:nextDocPrId++
  }
  foreach ($picPr in $paragraph.SelectNodes('.//pic:cNvPr', $ns)) {
    [void]$picPr.SetAttribute('name', $title)
    [void]$picPr.SetAttribute('descr', $title)
  }
  return ,$paragraph
}

function Insert-SequenceAfter([System.Xml.XmlElement]$anchor, [System.Xml.XmlNode[]]$nodes) {
  $parent = $anchor.ParentNode
  $reference = $anchor.NextSibling
  foreach ($node in $nodes) { [void]$parent.InsertBefore($node, $reference) }
}

$figure15 = Add-Image (Join-Path $evidence 'Figure_3_15_Destination_Discovery.png') 'image16.png' 446 250.9 'Nuogo destination discovery and attraction map interface'
$figure16 = Add-Image (Join-Path $evidence 'Figure_3_16_Preferences_TravelStyle.png') 'image17.png' 365 500.4 'Nuogo travel preference and Travel Style configuration interface'
$figure17 = Add-Image (Join-Path $evidence 'Figure_3_17_Admin_Maintenance.png') 'image18.png' 446 250.9 'Nuogo authorised maintenance interface'
$figure18 = Add-Image (Join-Path $evidence 'Figure_3_18_English_Localization.png') 'image19.png' 446 250.9 'Nuogo English localization interface'

$workspaceFigureAnchor = Find-Paragraph 'Figure 3.14 Generated One-Itinerary WorkspaceSource: Developed by the author.'
Insert-SequenceAfter $workspaceFigureAnchor @(
  (New-BodyParagraph 'Figure 3.15 documents the destination-discovery stage with Beijing selected. It presents the localized destination introduction, categorized grounded-attraction cards, OpenTripMap source labels, and corresponding map markers so that travellers can inspect supported choices before configuring an itinerary.'),
  $figure15,
  (New-CaptionParagraph 'Figure 3.15 Nuogo Destination Discovery and Attraction Map Interface'),
  (New-BodyParagraph 'Figure 3.16 records the pre-generation preference workflow. Panel A shows the origin, destination, travel dates and times, traveller count, and hard total budget. Panel B shows a MANUAL set of high-priority grounded-attraction preferences, one selected Travel Style, and the optional Rainy-Day Backup control; the backup remains an inactive contingency unless the traveller chooses to use it.'),
  $figure16,
  (New-CaptionParagraph 'Figure 3.16 Nuogo Travel Preference and Travel Style Configuration Interface')
)

$maintenanceAnchor = Find-Paragraph 'A protected supporting interface allows authorised maintainers to update supported destinations, POIs, and cost-reference records required by the MVP. It is not presented as a major traveller-facing function or research contribution. The main evaluation remains focused on the traveller workflow and the three research objectives.'
Insert-SequenceAfter $maintenanceAnchor @(
  (New-BodyParagraph 'Figure 3.17 demonstrates the role-protected supporting maintenance surface and its destination, POI, and cost-reference sections. The visible cost-reference records are explicitly labelled as deterministic demonstration fixtures rather than live evidence. The maintenance interface is supporting functionality for destinations, POIs, and cost-reference data rather than a primary research contribution.'),
  $figure17,
  (New-CaptionParagraph 'Figure 3.17 Nuogo Authorised Maintenance Interface'),
  (New-BodyParagraph 'Figure 3.18 provides interface-level evidence of English localization after an explicit language change and refresh. Navigation, preference labels, Travel Style choices, source-aware backup wording, and form controls are presented in English without exposing internal enum values.'),
  $figure18,
  (New-CaptionParagraph 'Figure 3.18 Nuogo English Localization Interface'),
  (New-BodyParagraph 'The interface evidence in Figures 3.15 to 3.18 was captured from the frozen application in its controlled deterministic demonstration environment. The screenshots demonstrate the implemented workflow and presentation behaviour; they are not represented as live OpenTripMap, OpenRouter, or MySQL responses.')
)

# Remove only terminal empty body paragraphs that would otherwise create a blank final page.
$body = $xml.SelectSingleNode('//w:body', $ns)
while ($true) {
  $candidate = @($body.ChildNodes | Where-Object { $_.NodeType -eq [System.Xml.XmlNodeType]::Element -and $_.LocalName -ne 'sectPr' })[-1]
  if (-not $candidate -or $candidate.LocalName -ne 'p' -or (Get-NodeText $candidate) -ne '' -or $candidate.SelectSingleNode('.//a:blip', $ns)) { break }
  [void]$body.RemoveChild($candidate)
}

$xml.Save($documentPath)
$rels.Save($relationshipsPath)

$fileStream = [System.IO.File]::Open($rebuilt, [System.IO.FileMode]::CreateNew)
try {
  $archive = New-Object System.IO.Compression.ZipArchive($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
  try {
    foreach ($file in Get-ChildItem -LiteralPath $work -File -Recurse) {
      $entryName = $file.FullName.Substring($work.Length + 1).Replace('\', '/')
      $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
      $entryStream = $entry.Open()
      $sourceStream = [System.IO.File]::OpenRead($file.FullName)
      try { $sourceStream.CopyTo($entryStream) } finally { $sourceStream.Dispose(); $entryStream.Dispose() }
    }
  } finally { $archive.Dispose() }
} finally { $fileStream.Dispose() }

Move-Item -LiteralPath $rebuilt -Destination $output -Force
Write-Output ('DOCX=' + $output)
Write-Output ('BYTES=' + (Get-Item -LiteralPath $output).Length)
Write-Output ('SHA256=' + (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash)
