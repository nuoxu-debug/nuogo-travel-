$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$docx = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.docx'
$fypRoot = Split-Path -Parent $PSScriptRoot
$diagramDir = Join-Path $PSScriptRoot 'diagrams'
$artifactDir = Join-Path $fypRoot '.worktrees\report-aligned-nuogo\.artifacts'
$work = Join-Path $env:TEMP ('nuogo-report-edit-' + [guid]::NewGuid().ToString('N'))
$rebuilt = Join-Path $env:TEMP ('nuogo-final-aligned-' + [guid]::NewGuid().ToString('N') + '.docx')

[System.IO.Compression.ZipFile]::ExtractToDirectory($docx, $work)

$documentPath = Join-Path $work 'word\document.xml'
$relationshipsPath = Join-Path $work 'word\_rels\document.xml.rels'
$xml = New-Object System.Xml.XmlDocument
$xml.PreserveWhitespace = $true
$xml.Load($documentPath)

$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
$ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
$ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
$ns.AddNamespace('wp', 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing')
$w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function Get-NodeText([System.Xml.XmlNode]$node) {
  return (($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
}

function Set-ParagraphText([System.Xml.XmlElement]$paragraph, [string]$text) {
  $children = @($paragraph.ChildNodes)
  foreach ($child in $children) {
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
  $children = @($paragraph.ChildNodes)
  foreach ($child in $children) {
    if ($child.LocalName -ne 'pPr') { [void]$paragraph.RemoveChild($child) }
  }
  $run = $xml.CreateElement('w', 'r', $w)
  $t1 = $xml.CreateElement('w', 't', $w); $t1.InnerText = $first
  $br = $xml.CreateElement('w', 'br', $w)
  $t2 = $xml.CreateElement('w', 't', $w); $t2.InnerText = $second
  [void]$run.AppendChild($t1); [void]$run.AppendChild($br); [void]$run.AppendChild($t2)
  [void]$paragraph.AppendChild($run)
}

function Find-Paragraph([string]$exactText) {
  foreach ($paragraph in $xml.SelectNodes('//w:body/w:p', $ns)) {
    if ((Get-NodeText $paragraph) -eq $exactText) { return $paragraph }
  }
  throw "Paragraph not found: $exactText"
}

function Replace-Paragraph([string]$exactText, [string]$replacement) {
  $paragraph = Find-Paragraph $exactText
  Set-ParagraphText $paragraph $replacement
}

function Set-CellText([System.Xml.XmlElement]$cell, [string]$text) {
  $paragraph = $cell.SelectSingleNode('./w:p', $ns)
  if (-not $paragraph) {
    $paragraph = $xml.CreateElement('w', 'p', $w)
    [void]$cell.AppendChild($paragraph)
  }
  Set-ParagraphText $paragraph $text
}

function Find-TableByFirstCell([string]$text) {
  foreach ($table in $xml.SelectNodes('//w:body/w:tbl', $ns)) {
    $first = $table.SelectSingleNode('./w:tr[1]/w:tc[1]', $ns)
    if ($first -and (Get-NodeText $first) -eq $text) { return $table }
  }
  throw "Table not found by first cell: $text"
}

function Replace-TableValue([string]$firstCell, [string]$rowKey, [int]$columnIndex, [string]$replacement) {
  $table = Find-TableByFirstCell $firstCell
  foreach ($row in $table.SelectNodes('./w:tr', $ns)) {
    $cells = @($row.SelectNodes('./w:tc', $ns))
    if ($cells.Count -ge $columnIndex -and (Get-NodeText $cells[0]) -eq $rowKey) {
      Set-CellText $cells[$columnIndex - 1] $replacement
      return
    }
  }
  throw "Row not found: $rowKey in $firstCell"
}

function New-BodyParagraph([string]$text, [bool]$centered = $false) {
  $paragraph = $xml.CreateElement('w', 'p', $w)
  if ($centered) {
    $pPr = $xml.CreateElement('w', 'pPr', $w)
    $jc = $xml.CreateElement('w', 'jc', $w)
    [void]$jc.SetAttribute('val', $w, 'center')
    [void]$pPr.AppendChild($jc)
    [void]$paragraph.AppendChild($pPr)
  }
  Set-ParagraphText $paragraph $text
  return ,$paragraph
}

# Chapter 1 cross-reference.
Replace-Paragraph 'The major milestones are summarised in Table 1.1. They identify the expected completion points for FYP 1 and FYP 2 activities.' 'The major milestones are summarised in Table 1.3. They identify the expected completion points for FYP 1 and FYP 2 activities.'

# OpenRouter configuration, privacy, and same-model provider failover.
Replace-Paragraph 'OpenRouter does not publish one fixed model-specific requests-per-minute value for DeepSeek V3.1 on the model page. Nuogo therefore treats HTTP 429 responses, provider timeouts, and temporary provider failures as external-service failure conditions. Provider-layer failover is used to retry another eligible provider serving the same DeepSeek V3.1 model when the initially selected provider is unavailable or rate-limited.' 'OpenRouter does not publish one fixed model-specific requests-per-minute value for DeepSeek V3.1 on the model page. Nuogo therefore treats HTTP 429 responses, provider timeouts, and temporary provider failures as external-service failure conditions. OpenRouter may route the same DeepSeek V3.1 model through another eligible provider when the initially selected provider is unavailable or rate-limited. This provider-layer routing does not switch Nuogo to a different LLM model.'
Replace-Paragraph 'For data privacy, OpenRouter prompt-and-response logging and product-improvement opt-in settings are kept disabled for the Nuogo integration. Nuogo uses a Zero Data Retention (ZDR) routing policy for LLM requests so that requests are restricted to eligible provider endpoints that do not retain prompt or response content. Only the minimum travel information required for itinerary generation is transmitted; passwords, authentication tokens, API keys, and unrelated account information are excluded. OpenRouter request metadata such as token counts and latency may still be retained by the platform for operational reporting.' 'For data privacy, Nuogo requests eligible Zero Data Retention (ZDR) and no-data-collection routing for LLM requests. Only the minimum travel information required for itinerary generation is transmitted; passwords, authentication tokens, API keys, and unrelated account information are excluded. Account-level logging and other platform settings remain deployment controls that must be verified in the actual OpenRouter account before live deployment. OpenRouter may still retain non-content request metadata, such as token counts and latency, for operational reporting.'
Replace-TableValue 'Item' 'Provider Failure Handling' 2 'OpenRouter may route the same DeepSeek V3.1 model through another eligible provider; no secondary-model fallback is used.'
Replace-TableValue 'Item' 'OpenRouter Prompt Logging' 2 'Per-request no-data-collection routing is requested; account-level logging remains a deployment setting requiring verification.'
Replace-TableValue 'Item' 'Data-Retention Control' 2 'Eligible Zero Data Retention routing is requested; operational metadata may still be retained by OpenRouter.'

# Sequential Chapter 3 table numbering.
Replace-Paragraph 'Table 3.2 Respondent Demographic Profile' 'Table 3.1 Respondent Demographic Profile'
Replace-Paragraph 'Table 3.1 Agile Iterative Cycle Used in Nuogo' 'Table 3.2 Agile Iterative Cycle Used in Nuogo'

# Remove duplicate output-quality heading and move the Table 3.3 caption before its table.
$duplicateHeadings = @($xml.SelectNodes('//w:body/w:p', $ns) | Where-Object { (Get-NodeText $_) -eq '3.2.8.4.7 LLM Output-Quality Evaluation' })
if ($duplicateHeadings.Count -ne 2) { throw "Expected two duplicate 3.2.8.4.7 headings, found $($duplicateHeadings.Count)" }
[void]$duplicateHeadings[1].ParentNode.RemoveChild($duplicateHeadings[1])
$evaluationTable = Find-TableByFirstCell 'Metric'
$evaluationCaption = Find-Paragraph 'Table 3.3 LLM Output Evaluation Metrics and Acceptance Criteria'
[void]$evaluationCaption.ParentNode.RemoveChild($evaluationCaption)
[void]$evaluationTable.ParentNode.InsertBefore($evaluationCaption, $evaluationTable)

# Source/provenance language and supporting maintenance scope.
Replace-Paragraph '3.6.2.6 Verified Information Boundary and Data Provenance' '3.6.2.6 Source, Provenance, and Verification Boundary'
Replace-Paragraph 'The simplified architecture keeps a conventional web structure. The traveller interacts with a React/Vite presentation layer. Node.js and Express coordinate authentication, essential preference processing, OpenTripMap grounding, LLM generation, validation, budget calculation, and rainy-day contingency logic. MySQL stores persistent application records and cost references. OpenTripMap and OpenRouter/DeepSeek V3.1 remain external services. Basic maintenance of cost-reference records is supporting functionality rather than a separate research module.' 'The simplified architecture keeps a conventional web structure. The traveller interacts with a React/Vite presentation layer. Node.js and Express coordinate authentication, essential preference processing, OpenTripMap grounding, LLM generation, validation, budget calculation, and rainy-day contingency logic. MySQL stores persistent application records and reference data. OpenTripMap and OpenRouter/DeepSeek V3.1 remain external services. Authorised maintenance of supported destinations, point-of-interest records, and cost-reference data is supporting functionality rather than a separate research module.'
Replace-Paragraph 'The Presentation Layer provides the traveller-facing web interface for authentication, destination discovery, essential preference entry, travel-style selection, optional rainy-day backup, itinerary presentation, budget summaries, map markers, and itinerary management. A small protected maintenance view may be used for cost-reference updates.' 'The Presentation Layer provides the traveller-facing web interface for authentication, destination discovery, essential preference entry, travel-style selection, optional rainy-day backup, itinerary presentation, budget summaries, map markers, and itinerary management. Protected supporting views allow authorised maintainers to update supported destinations, POIs, and cost-reference records.'
Replace-Paragraph 'The simplified Nuogo MVP is explained through five core functional modules. This structure keeps the system understandable for implementation, testing, and presentation. Basic maintenance of cost-reference data remains a supporting function but is not treated as a separate research contribution.' 'The simplified Nuogo MVP is explained through five core functional modules. This structure keeps the system understandable for implementation, testing, and presentation. Maintenance of supported destinations, POIs, and cost-reference data remains a supporting function and is not treated as a separate research contribution.'
Replace-Paragraph 'A small authorised maintenance function supports updates to cost-reference records and selected supported data required by the MVP. This is treated as supporting application maintenance rather than a main research module. Advanced user administration, analytics, and enterprise monitoring are outside the core project contribution.' 'Authorised maintainers can manage supported destinations, point-of-interest records, and cost-reference data used by the planning system. This remains supporting application maintenance rather than a main research module. Advanced user administration, analytics, guide or agency management, booking, payments, and enterprise monitoring remain outside the core project contribution.'
Replace-Paragraph 'The simplified use case model has one primary actor, the Traveller, plus two external services: OpenTripMap and OpenRouter/DeepSeek V3.1. An authorised maintainer has only a supporting cost-reference function. The traveller''s main use cases are registration/login, attraction discovery, essential preference entry, travel-style selection, optional rainy-day backup, generation of one itinerary, validation/budget review, map/source review, and itinerary management.' 'The simplified use case model has two human actors: the Traveller and an Authorised Maintainer. OpenTripMap and OpenRouter/DeepSeek V3.1 are supporting external systems rather than human actors. The traveller can register, log in or continue as a guest, manage a profile, discover attractions, choose MANUAL or AUTO attraction preferences, enter essential preferences, select one Travel Style, optionally enable Rainy-Day Backup, generate and manage one itinerary workspace, and review budget, map, and provenance information. The authorised maintainer supports destinations, POIs, and cost-reference records.'
Replace-Paragraph 'A small protected maintenance interface may be used to update cost-reference values and selected supported records required by the MVP. It is not presented as a major user-facing or research contribution. The main evaluation remains focused on the traveller workflow and the three research objectives.' 'A protected supporting interface allows authorised maintainers to update supported destinations, POIs, and cost-reference records required by the MVP. It is not presented as a major traveller-facing function or research contribution. The main evaluation remains focused on the traveller workflow and the three research objectives.'
Replace-TableValue 'Scope Area' 'Users' 2 'Traveller account, login, profile and itinerary management; authorised supporting maintenance of destinations, POIs, and cost-reference records.'
Replace-TableValue 'ID' 'FR14' 3 'Authorised maintenance functions shall support updates to supported destinations, POIs, and cost-reference records without making administration a core research contribution.'

# ERD explanatory text and logical data groups.
Replace-Paragraph 'Figure 3.10 presents a simplified logical Entity Relationship Diagram (ERD) aligned with the current MVP. It shows the core entities and relationships required for user accounts and profiles, travel preferences, grounded attractions, generated itineraries, itinerary days and activities, optional transport details, and cost-reference data. The diagram deliberately omits non-core operational tables so that the report reflects the simplified system scope. The final physical table definitions should remain synchronised with the implemented MySQL schema.' 'Figure 3.10 presents a logical Entity Relationship Diagram aligned with the frozen MVP persistence model. USER, TRIP, SUPPORTED_DESTINATION, CANONICAL_POI, COST_REFERENCE, ITINERARY_RUN, TRIP_LEG, and traceability records represent meaningful persistent data groups. Current travel preferences and nested itinerary days, activities, meals, transport details, and optional inactive Rainy-Day Backup information are persisted within JSON payloads where implemented rather than being presented as separate physical tables.'
Replace-Paragraph 'The ERD is presented as a logical design model. Primary keys (PK) uniquely identify records, foreign keys (FK) connect related entities, and the 1/M cardinality labels indicate one-to-one or one-to-many relationships. Where a many-to-many relationship is required, an associative entity such as PREFERENCE_ATTRACTION is used to resolve the relationship into two one-to-many relationships.' 'The ERD is a logical design model: primary keys identify records, foreign keys connect related entities, and the 1/M labels indicate one-to-many relationships. MANUAL attraction selections are high-priority preference inputs that remain subject to grounding, schedule, density, duplication, and hard-budget validation; Nuogo does not implement a mandatory Must Visit field. One generation request creates one logical itinerary run, while provenance, validation, and repair records support traceability.'
Replace-TableValue 'Data group' 'Travel preferences' 2 'Destination, dates, budget, travellers, interests, high-priority preferred attractions, selected Travel Style, and Rainy-Day Backup preference stored within the trip preference payload where implemented.'
Replace-TableValue 'Data group' 'Itineraries' 2 'One logical itinerary run per generation request, with nested day/activity details and optional inactive backup information stored in the objective payload where implemented; route legs are persisted separately where supported.'
Replace-TableValue 'Data group' 'System / API records' 2 'Provenance, validation outcomes, repair records, and operational/API metadata required for traceability and controlled failure handling without storing credentials or unnecessary prompt content.'

# Budget-reference evidence boundary.
Replace-Paragraph 'The Nuogo MVP provides estimated travel costs for Beijing, Shanghai, and Xi''an. It does not retrieve guaranteed real-time accommodation, transportation, food, attraction, entertainment, or booking prices. Instead, the budget module uses administrator-maintained planning reference values collected from named, traceable public sources and stored in the system database. The reference dataset is designed to make budget calculations reproducible and to prevent the LLM from inventing unsupported prices.' 'The Nuogo MVP provides estimated travel costs for Beijing, Shanghai, and Xi''an. It does not retrieve guaranteed real-time accommodation, transportation, food, attraction, entertainment, or booking prices. Table 3.11 presents a prepared reference dataset used to define controlled planning values and support evaluation. The implemented architecture supports persistence and authorised maintenance of cost-reference records; however, the final live verification did not establish that every value listed in Table 3.11 had been imported into a disposable MySQL integration database.'
Replace-Paragraph 'The reference dataset is reviewed at least once every three months or earlier when a source changes materially. A record whose source can no longer be verified or whose review period has expired may be marked as outdated or unavailable.During formal evaluation, system-estimated costs are compared with the prepared reference dataset for the nine fixed travel-planning scenarios in Beijing, Shanghai, and Xi''an. Budget-estimation error is measured using the percentage difference between the system-estimated amount and the corresponding reference amount, while category totals are checked for double counting. Every generated itinerary must remain within the user''s hard total-budget ceiling. All displayed amounts remain labelled as planning estimates rather than guaranteed current prices.' 'The prepared reference dataset should be reviewed at least once every three months or earlier when a source changes materially. A record whose source can no longer be traced or whose review period has expired may be marked as outdated or unavailable. During formal evaluation, system-estimated costs can be compared with the prepared reference dataset for fixed scenarios in Beijing, Shanghai, and Xi''an. Category totals remain subject to double-counting checks and every generated itinerary must remain within the user''s hard total-budget ceiling. All displayed amounts remain planning estimates rather than guaranteed current prices.'
Replace-Paragraph 'Table 3.11 Final Budget Reference Dataset for the Nuogo MVP (Collected 28 August 2026)' 'Table 3.11 Prepared Budget Reference Dataset for the Nuogo MVP (Collected 28 August 2026)'
Replace-Paragraph 'Source note: Trip.com public hotel and 2026 food-guide pages; Beijing Subway/Beijing Municipal Government fare rules; Shanghai Municipal Government metro and tourism pages; Shaanxi Rail Transit Group fare policy; China Railway 12306 as the primary rail reference with July 2026 route-fare cross-checks; Palace Museum official ticket policy; Terracotta Warriors Museum ticket information; Universal Beijing Resort ticket page; and current Tang Paradise visitor information. Values are planning references, not guaranteed real-time booking quotations.' 'Source note: The prepared values draw on the named public hotel and food-guide pages, municipal transport and tourism pages, China Railway 12306 and route-fare cross-checks, and named official attraction or venue information listed in Table 3.11. These sources support planning-reference preparation; the values are not guaranteed real-time quotations and were not established as a fully imported live-MySQL dataset during final acceptance.'

# Retention and provider privacy controls in Table 3.9.
Replace-TableValue 'Requirement' 'Secure Logging' 2 'Application and security errors are recorded without intentionally logging passwords, API keys, authentication tokens, or LLM prompt/response content. Operational log retention is controlled by deployment policy; automated retention-period enforcement is outside the current MVP. A deployment may adopt a maximum 90-day policy subject to institutional requirements and configuration.'
Replace-TableValue 'Requirement' 'External LLM Data Retention' 2 'Nuogo requests eligible Zero Data Retention and no-data-collection routing for LLM requests. Account-level logging and platform configuration remain deployment settings that must be verified before live deployment; OpenRouter may still retain non-content operational metadata.'

# Normalize numbered Chapter 3 heading styles by hierarchy depth.
foreach ($paragraph in $xml.SelectNodes('//w:body/w:p', $ns)) {
  $text = Get-NodeText $paragraph
  if ($text -match '^3(?:\.\d+){1,5}\s') {
    $number = $text.Split(' ')[0]
    $depth = ($number.ToCharArray() | Where-Object { $_ -eq '.' }).Count
    $style = switch ($depth) { 1 { '3' } 2 { '4' } 3 { '5' } default { '6' } }
    $pPr = $paragraph.SelectSingleNode('./w:pPr', $ns)
    if (-not $pPr) { $pPr = $xml.CreateElement('w', 'pPr', $w); [void]$paragraph.PrependChild($pPr) }
    $pStyle = $pPr.SelectSingleNode('./w:pStyle', $ns)
    if (-not $pStyle) { $pStyle = $xml.CreateElement('w', 'pStyle', $w); [void]$pPr.PrependChild($pStyle) }
    [void]$pStyle.SetAttribute('val', $w, $style)
  }
}

# Replace the six approved diagrams and resize their Word drawing extents.
$replacements = @{
  'rId6'  = @{ File = 'figure2_1.png';  Target = 'image1.png';  WidthPt = 449.2; HeightPt = 252.7 }
  'rId7'  = @{ File = 'figure3_1.png';  Target = 'image2.png';  WidthPt = 449.2; HeightPt = 252.7 }
  'rId14' = @{ File = 'figure3_8.png';  Target = 'image9.png';  WidthPt = 446.2; HeightPt = 251.0 }
  'rId16' = @{ File = 'figure3_10.png'; Target = 'image11.png'; WidthPt = 648.0; HeightPt = 360.0 }
  'rId17' = @{ File = 'figure3_11.png'; Target = 'image12.png'; WidthPt = 446.0; HeightPt = 272.6 }
  'rId18' = @{ File = 'figure3_12.png'; Target = 'image13.png'; WidthPt = 446.0; HeightPt = 272.6 }
}
foreach ($rid in $replacements.Keys) {
  $item = $replacements[$rid]
  Copy-Item -LiteralPath (Join-Path $diagramDir $item.File) -Destination (Join-Path $work ('word\media\' + $item.Target)) -Force
  $blip = $xml.SelectSingleNode("//a:blip[@r:embed='$rid']", $ns)
  if (-not $blip) { throw "Image relationship not found: $rid" }
  $inline = $blip.SelectSingleNode('ancestor::wp:inline[1]', $ns)
  $cx = [string][math]::Round($item.WidthPt * 12700)
  $cy = [string][math]::Round($item.HeightPt * 12700)
  $extent = $inline.SelectSingleNode('./wp:extent', $ns)
  [void]$extent.SetAttribute('cx', $cx); [void]$extent.SetAttribute('cy', $cy)
  $xfrmExtent = $inline.SelectSingleNode('.//a:xfrm/a:ext', $ns)
  if ($xfrmExtent) { [void]$xfrmExtent.SetAttribute('cx', $cx); [void]$xfrmExtent.SetAttribute('cy', $cy) }
}

# Insert two genuine frozen-system screenshots as Figures 3.13 and 3.14.
$rels = New-Object System.Xml.XmlDocument
$rels.PreserveWhitespace = $true
$rels.Load($relationshipsPath)
$relationshipNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
$ids = @($rels.DocumentElement.ChildNodes | ForEach-Object { if ($_.Id -match '^rId(\d+)$') { [int]$Matches[1] } })
$nextId = (($ids | Measure-Object -Maximum).Maximum + 1)

function Add-ImageRelationship([string]$target) {
  $id = 'rId' + $script:nextId
  $script:nextId++
  $rel = $rels.CreateElement('Relationship', $relationshipNs)
  [void]$rel.SetAttribute('Id', $id)
  [void]$rel.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image')
  [void]$rel.SetAttribute('Target', 'media/' + $target)
  [void]$rels.DocumentElement.AppendChild($rel)
  return $id
}

$landingTarget = 'image14.png'
$workspaceTarget = 'image15.png'
Copy-Item -LiteralPath (Join-Path $artifactDir 'final-unified-running.png') -Destination (Join-Path $work ('word\media\' + $landingTarget)) -Force
Copy-Item -LiteralPath (Join-Path $artifactDir 'final-freeze-teacher-1920.png') -Destination (Join-Path $work ('word\media\' + $workspaceTarget)) -Force
$landingRid = Add-ImageRelationship $landingTarget
$workspaceRid = Add-ImageRelationship $workspaceTarget

$imageTemplate = $xml.SelectSingleNode('//w:body/w:p[.//a:blip][1]', $ns)
function New-ImageParagraph([string]$rid, [double]$widthPt, [double]$heightPt) {
  $paragraph = $imageTemplate.CloneNode($true)
  foreach ($blip in $paragraph.SelectNodes('.//a:blip', $ns)) { [void]$blip.SetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', $rid) }
  $cx = [string][math]::Round($widthPt * 12700); $cy = [string][math]::Round($heightPt * 12700)
  foreach ($extent in $paragraph.SelectNodes('.//wp:extent', $ns)) { [void]$extent.SetAttribute('cx', $cx); [void]$extent.SetAttribute('cy', $cy) }
  foreach ($extent in $paragraph.SelectNodes('.//a:xfrm/a:ext', $ns)) { [void]$extent.SetAttribute('cx', $cx); [void]$extent.SetAttribute('cy', $cy) }
  return ,$paragraph
}

function Insert-ScreenshotAfter([string]$anchorText, [string]$intro, [string]$rid, [double]$widthPt, [double]$heightPt, [string]$caption) {
  $anchor = Find-Paragraph $anchorText
  $introParagraph = New-BodyParagraph $intro
  $imageParagraph = New-ImageParagraph $rid $widthPt $heightPt
  $captionParagraph = New-BodyParagraph '' $true
  Set-ParagraphWithBreak $captionParagraph $caption 'Source: Developed by the author.'
  $parent = $anchor.ParentNode
  $reference = $anchor.NextSibling
  [void]$parent.InsertBefore($introParagraph, $reference)
  [void]$parent.InsertBefore($imageParagraph, $reference)
  [void]$parent.InsertBefore($captionParagraph, $reference)
}

Insert-ScreenshotAfter 'The Nuogo user interface is designed as a short responsive workflow from authentication to attraction discovery, essential preference entry, travel-style selection, optional rainy-day backup, itinerary generation, and itinerary management. Complex internal validation is hidden behind clear user-facing status, budget, map, and source information.' 'Figure 3.13 shows the frozen Nuogo landing interface and the entry points to authentication and itinerary planning.' $landingRid 446.0 278.8 'Figure 3.13 Nuogo Landing and Authentication Entry Interface'
Insert-ScreenshotAfter 'The itinerary workspace displays the selected plan in day-by-day form. Activity entries may include localized attraction names, time, estimated duration, category, available description, personalised recommendation reason, estimated cost, source label, and verification status. Transport segments show the origin, destination, transport mode, estimated distance, time, and cost where supported by the current calculation model. Daily summaries combine activities, meals, transport, and estimated spending information to make the itinerary practical for trip preparation.' 'Figure 3.14 shows the frozen one-itinerary workspace with the inactive Rainy-Day Backup, grounded source label, map, itinerary details, and estimated budget presentation.' $workspaceRid 446.0 351.0 'Figure 3.14 Generated One-Itinerary Workspace'

$xml.Save($documentPath)
$rels.Save($relationshipsPath)

if (Test-Path -LiteralPath $rebuilt) { Remove-Item -LiteralPath $rebuilt -Force }
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
Move-Item -LiteralPath $rebuilt -Destination $docx -Force

Write-Output ('DOCX=' + $docx)
Write-Output ('WORK=' + $work)
Write-Output ('BYTES=' + (Get-Item -LiteralPath $docx).Length)
Write-Output ('SHA256=' + (Get-FileHash -LiteralPath $docx -Algorithm SHA256).Hash)
