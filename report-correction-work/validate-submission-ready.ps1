$ErrorActionPreference = 'Stop'

$docx = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_SUBMISSION.docx'
$pdf = 'C:\Users\G16\Downloads\Nuogo_FINAL_SUBMISSION_citation_check.pdf'
Remove-Item -LiteralPath $pdf -Force -ErrorAction SilentlyContinue

$word = $null
$document = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($docx, $false, $true)
    $document.Repaginate()
    $text = $document.Content.Text
    $document.ExportAsFixedFormat($pdf, 17)

    Write-Output 'WORD_OPENS=YES'
    Write-Output "WORD_PAGES=$($document.ComputeStatistics(2))"
    Write-Output "WORD_PARAGRAPHS=$($document.Paragraphs.Count)"
    Write-Output "WORD_TABLES=$($document.Tables.Count)"
    Write-Output "WORD_IMAGES=$($document.InlineShapes.Count)"
    Write-Output "REFERENCES_VISIBLE=$($text.Contains('REFERENCES'))"
    Write-Output "MIDDLE_REFERENCES_PRESENT=$($text.Contains('References for Table 3.11'))"
    Write-Output "PDF=$pdf"
    Write-Output "PDF_BYTES=$((Get-Item -LiteralPath $pdf).Length)"

    $document.Close(0)
    $document = $null
    try { $word.Quit() } catch { Write-Output "WORD_QUIT_WARNING=$($_.Exception.Message)" }
    $word = $null
}
finally {
    if ($document) { try { $document.Close(0) } catch {} }
    if ($word) { try { $word.Quit() } catch {} }
}
