$ErrorActionPreference = 'Stop'
$path = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.docx'
$pdf = Join-Path $env:TEMP 'Nuogo_FYP_Final_Report_Chapter1-3_FINAL_ALIGNED.pdf'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $null
try {
  $doc = $word.Documents.Open($path, $false, $false)
  foreach ($pair in @(@('planning style', 'Travel Style'), @('travel style', 'Travel Style'))) {
    $find = $doc.Content.Find
    $find.ClearFormatting()
    $find.Replacement.ClearFormatting()
    [void]$find.Execute($pair[0], $false, $false, $false, $false, $false, $true, 1, $false, $pair[1], 2)
  }

  $replacements = @{
    'The budget module uses administrator-maintained reference values rather than real-time booking prices.' = "The budget module uses authorised-maintainer reference values rather than real-time booking prices. The estimated amounts therefore support preliminary planning but cannot guarantee the user's actual expenditure."
    'The documentation activity records the implemented system functions' = 'The documentation activity records the implemented system functions, architecture, database design, user interface, methodology, technologies, testing and evaluation results, operating procedures, and system limitations. Traveller and authorised-maintainer guidance is prepared where required. The final submission then brings together the completed Nuogo system, source code, final report, presentation slides, demonstration materials, and other required supporting artefacts for project assessment.'
    'The software requirements define what Nuogo must do' = 'The software requirements define what Nuogo must do and the quality conditions under which the system should operate. The requirements are derived from the research objectives, scope, literature review, stakeholder survey, and system design. Functional requirements describe the services provided to travellers and authorised maintainers, while non-functional requirements define security, reliability, usability, performance, maintainability, transparency, and compatibility expectations.'
    'Nuogo distinguishes information according to both source and verification status.' = 'Nuogo distinguishes information according to both source and verification status. User-provided information includes the destination, dates, budget, number of travellers, selected attractions, and other preferences entered by the user. OpenTripMap API-sourced information includes attraction identifiers, names, categories, coordinates, and descriptions where available. Database-backed information includes saved records and authorised-maintainer reference values. AI-generated information includes itinerary sequencing, personalised explanations, and recommendation reasons. System-generated estimates include calculated travel costs and other values derived from predefined rules and reference data.'
    'Database-backed information includes stored user profiles' = 'Database-backed information includes stored user profiles, preferences, saved itinerary records, and authorised-maintainer cost-reference values. The database records provide persistence and traceability, while the collection date and last-updated date of cost references help users and authorised maintainers understand the age of the planning data.'
    'The validated input and grounded attraction candidates are sent to DeepSeek V3.1' = 'The validated input and grounded attraction candidates are sent to DeepSeek V3.1 to generate one structured itinerary draft. The backend checks schema completeness, attraction grounding, dates, duplicates, and hard-budget compliance. If the draft fails, one controlled repair/regeneration attempt is allowed; otherwise the request ends with a controlled failure message. If the Rainy-Day Backup option is enabled, a grounded indoor or less weather-sensitive alternative may be attached to a suitable outdoor activity without querying live weather. The contingency remains inactive, and its feasibility and estimated cost are checked without adding the unused alternative to the main active itinerary total. The validated itinerary is then saved and displayed with budget information, map markers, source labels, and management actions.'
  }

  foreach ($paragraph in $doc.Paragraphs) {
    $text = ($paragraph.Range.Text -replace '[\r\a]', '').Trim()
    foreach ($prefix in $replacements.Keys) {
      if ($text.StartsWith($prefix)) {
        $range = $paragraph.Range.Duplicate
        $range.End = $range.End - 1
        $range.Text = $replacements[$prefix]
        break
      }
    }
  }

  $doc.Save()
  $doc.ExportAsFixedFormat($pdf, 17)
  Write-Output ('PAGES=' + $doc.ComputeStatistics(2))
  Write-Output ('PARAGRAPHS=' + $doc.Paragraphs.Count)
  Write-Output ('TABLES=' + $doc.Tables.Count)
  Write-Output ('IMAGES=' + $doc.InlineShapes.Count)
  $doc.Close($false)
  $doc = $null
} finally {
  if ($doc) { try { $doc.Close($false) } catch {} }
  try { $word.Quit() } catch {}
  try { [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null } catch {}
}
