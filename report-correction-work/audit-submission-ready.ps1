$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$path = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_SUBMISSION.docx'
$zip = [IO.Compression.ZipFile]::OpenRead($path)
try {
    $entryNames = @($zip.Entries.FullName)
    function Read-ZipText([string] $name) {
        $entry = $zip.GetEntry($name)
        if (-not $entry) { throw "Missing package entry: $name" }
        $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    }

    [xml] $document = Read-ZipText 'word/document.xml'
    [xml] $relationships = Read-ZipText 'word/_rels/document.xml.rels'
    $ns = New-Object Xml.XmlNamespaceManager($document.NameTable)
    $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    $ns.AddNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main')
    $ns.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
    $relManager = New-Object Xml.XmlNamespaceManager($relationships.NameTable)
    $relManager.AddNamespace('p', 'http://schemas.openxmlformats.org/package/2006/relationships')

    function Node-Text($node) { return (($node.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') }
    $bodyParagraphs = @($document.SelectNodes('//w:body/w:p', $ns))
    $bodyTexts = @($bodyParagraphs | ForEach-Object { Node-Text $_ })
    $allText = (($document.SelectNodes('//w:t', $ns) | ForEach-Object { $_.InnerText }) -join "`n")

    $figureCaptions = @()
    $tableCaptions = @()
    foreach ($paragraph in $bodyParagraphs) {
        $paragraphText = Node-Text $paragraph
        if ($paragraphText -match '^Figure [123]\.\d+ ') {
            $previous = $paragraph.PreviousSibling
            while ($previous -and $previous.NodeType -ne [Xml.XmlNodeType]::Element) { $previous = $previous.PreviousSibling }
            if ($previous -and $previous.SelectSingleNode('.//a:blip', $ns)) { $figureCaptions += $paragraphText }
        }
        if ($paragraphText -match '^Table [123]\.\d+ ') {
            $next = $paragraph.NextSibling
            while ($next -and $next.NodeType -ne [Xml.XmlNodeType]::Element) { $next = $next.NextSibling }
            if ($next -and $next.LocalName -eq 'tbl') { $tableCaptions += $paragraphText }
        }
    }
    $figureNumbers = @($figureCaptions | ForEach-Object { if ($_ -match '^(Figure [123]\.\d+)') { $Matches[1] } })
    $tableNumbers = @($tableCaptions | ForEach-Object { if ($_ -match '^(Table [123]\.\d+)') { $Matches[1] } })
    $expectedFigures = @('Figure 2.1') + (1..18 | ForEach-Object { "Figure 3.$_" })
    $expectedTables = (1..4 | ForEach-Object { "Table 1.$_" }) + (1..5 | ForEach-Object { "Table 2.$_" }) + (1..11 | ForEach-Object { "Table 3.$_" })

    $relationshipMap = @{}
    foreach ($relationship in $relationships.DocumentElement.ChildNodes) { $relationshipMap[$relationship.Id] = $relationship }
    $brokenImages = @()
    foreach ($blip in @($document.SelectNodes('//a:blip', $ns))) {
        $rid = $blip.GetAttribute('embed', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
        $relationship = $relationshipMap[$rid]
        $target = if ($relationship) { $relationship.Target } else { $null }
        $packagePath = if ($target) { 'word/' + $target.TrimStart('/') } else { $null }
        if (-not $target -or $entryNames -notcontains $packagePath) { $brokenImages += "${rid}:$target" }
    }

    $hyperlinks = @($relationships.SelectNodes('//p:Relationship[contains(@Type,"/hyperlink")]', $relManager))
    $malformedUrls = @()
    foreach ($hyperlink in $hyperlinks) {
        $uri = $null
        if (-not [Uri]::TryCreate($hyperlink.Target, [UriKind]::Absolute, [ref] $uri) -or $uri.Scheme -ne 'https') {
            $malformedUrls += $hyperlink.Target
        }
    }

    $referencesIndex = [Array]::IndexOf($bodyTexts, 'REFERENCES')
    if ($referencesIndex -lt 0) { throw 'REFERENCES heading missing.' }
    $referenceTexts = @($bodyTexts[($referencesIndex + 1)..($bodyTexts.Count - 1)] | Where-Object {
        $_ -and $_ -notin @('Academic literature', 'Technical and official web sources')
    })
    $duplicateReferences = @($referenceTexts | Group-Object | Where-Object Count -gt 1)

    Write-Output "ZIP_ENTRIES=$($zip.Entries.Count)"
    Write-Output "REQUIRED_PARTS=$([bool](($entryNames -contains '[Content_Types].xml') -and ($entryNames -contains 'word/document.xml') -and ($entryNames -contains 'word/styles.xml') -and ($entryNames -contains 'word/numbering.xml')))"
    Write-Output "TABLES=$($document.SelectNodes('//w:tbl', $ns).Count)"
    Write-Output "DRAWINGS=$($document.SelectNodes('//w:drawing', $ns).Count)"
    Write-Output "IMAGE_RELATIONSHIPS=$($document.SelectNodes('//a:blip', $ns).Count)"
    Write-Output "BROKEN_IMAGE_RELATIONSHIPS=$($brokenImages.Count)"
    Write-Output "FIGURE_CAPTIONS=$($figureNumbers.Count)"
    Write-Output "FIGURE_SEQUENCE_MATCH=$([bool](($expectedFigures -join '|') -eq ($figureNumbers -join '|')))"
    Write-Output "TABLE_CAPTIONS=$($tableNumbers.Count)"
    Write-Output "TABLE_SEQUENCE_MATCH=$([bool](($expectedTables -join '|') -eq ($tableNumbers -join '|')))"
    Write-Output "REFERENCE_ENTRIES=$($referenceTexts.Count)"
    Write-Output "DUPLICATE_REFERENCE_ENTRIES=$($duplicateReferences.Count)"
    Write-Output "HYPERLINK_RELATIONSHIPS=$($hyperlinks.Count)"
    Write-Output "MALFORMED_HYPERLINKS=$($malformedUrls.Count)"
    Write-Output "PLACEHOLDER_URLS=$(@($hyperlinks | Where-Object { $_.Target -match 'example\.(com|org)|localhost|TODO' }).Count)"
    Write-Output "MIDDLE_REFERENCE_HEADING=$($allText.Contains('References for Table 3.11'))"
    Write-Output "CHINESE_TEXT_PRESENT=$([bool]($allText -match '[\u4e00-\u9fff]'))"
    Write-Output "REPLACEMENT_CHARACTER_PRESENT=$($allText.Contains([string][char]0xFFFD))"
    Write-Output "MOJIBAKE_AUTHOR_MARKERS=$([bool]($allText.Contains([char]0x679A) -or $allText.Contains([char]0x8305) -or $allText.Contains([char]0x8D38)))"
    Write-Output "OPEN_TRIPMAP_NOT_EXECUTED=$([bool]($allText -match 'OpenTripMap[^\r\n]{0,120}NOT EXECUTED'))"
    Write-Output "OPENROUTER_NOT_EXECUTED=$([bool]($allText -match 'OpenRouter[^\r\n]{0,120}NOT EXECUTED'))"
    Write-Output "MYSQL_NOT_EXECUTED=$([bool]($allText -match 'MySQL[^\r\n]{0,120}NOT EXECUTED'))"
    Write-Output "HUMAN_USEFULNESS_NOT_EVALUATED=$([bool]($allText -match 'Human Usefulness[^\r\n]{0,120}NOT EVALUATED'))"
} finally {
    $zip.Dispose()
}

$item = Get-Item -LiteralPath $path
Write-Output "BYTES=$($item.Length)"
Write-Output "SHA256=$((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash)"
