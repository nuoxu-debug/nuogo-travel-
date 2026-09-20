$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

$path = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_SUBMISSION.docx'
$zip = [IO.Compression.ZipFile]::OpenRead($path)
try {
    $reader = New-Object IO.StreamReader($zip.GetEntry('word/document.xml').Open(), [Text.Encoding]::UTF8)
    [xml] $xml = $reader.ReadToEnd()
    $reader.Close()
    $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
    $paragraphTexts = @($xml.SelectNodes('//w:p', $ns) | ForEach-Object { (($_.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') })
    $referenceIndex = [Array]::IndexOf($paragraphTexts, 'REFERENCES')
    if ($referenceIndex -lt 0) { throw 'REFERENCES heading missing.' }
    $usageText = $paragraphTexts[0..($referenceIndex - 1)] -join "`n"
    $referenceTexts = @($paragraphTexts[($referenceIndex + 1)..($paragraphTexts.Count - 1)] | Where-Object { $_ -and $_ -notin @('Academic literature', 'Technical and official web sources') })
    $referenceText = $referenceTexts -join "`n"

    $checks = @(
        @('Banerjee 2025', 'Banerjee[^\r\n]{0,80}2025', '^Banerjee, A\.'),
        @('Dwivedi 2024', 'Dwivedi et al\., 2024', '^Dwivedi, Y\.'),
        @('Hao 2024', 'Hao et al\. \(2024\)', '^Hao, Y\.'),
        @('Jiang 2025', 'Jiang et al\., 2025', '^Jiang, C\.'),
        @('Liu 2024', 'Liu et al\., 2024', '^Liu, N\.'),
        @('Mishra 2023', 'Mishra and Alzoubi \(2023\)', '^Mishra, A\.'),
        @('Qi 2024', 'Qi et al\., 2024', '^Qi, J\.'),
        @('Solano-Barliza 2024', 'Solano-Barliza et al\., 2024', '^Solano-Barliza, A\.'),
        @('Stankov 2020', 'Stankov & Gretzel, 2020', '^Stankov, U\.'),
        @('Xie 2024', 'Xie et al\., 2024', '^Xie, J\.'),
        @('Yahya 2022', 'Yahya and Maidin \(2022\)', '^Yahya, N\.'),
        @('Air China 2026', 'Air China partner offer \(2026\)', '^Air China\. \(2026'),
        @('Beijing Government 2025', "Beijing Municipal People's Government / Beijing Subway \(2025\)", "^Beijing Municipal People's Government\. \(2025"),
        @('China Railway n.d.', 'China Railway 12306 official fare-query service \(n\.d\.\)', '^China Railway 12306\. \(n\.d\.\)'),
        @('Qin Museum n.d.', "Emperor Qinshihuang's Mausoleum Site Museum official ticket information \(n\.d\.\)", "^Emperor Qinshihuang's Mausoleum Site Museum\. \(n\.d\.\)"),
        @('Leona 2026a', 'Leona, 2026a', '^Leona\. \(2026a'),
        @('Leona 2026b', 'Leona, 2026b', '^Leona\. \(2026b'),
        @('Robin 2026', 'Robin, 2026', '^Robin\. \(2026'),
        @('Shaanxi Rail 2024', "Shaanxi Rail Transit Group / Xi'an Metro \(2024\)", '^Shaanxi Rail Transit Group\. \(2024'),
        @('Shanghai Government 2025', "Shanghai Municipal People's Government tourism-festival notice \(2025\)", "^Shanghai Municipal People's Government\. \(2025"),
        @('Shanghai Government 2026a', "Shanghai Municipal People's Government \(2026a\)", "^Shanghai Municipal People's Government\. \(2026a"),
        @('Shanghai Government 2026b', "Shanghai Municipal People's Government, Shanghai Tower tourism notice \(2026b\)", "^Shanghai Municipal People's Government\. \(2026b"),
        @('Tang Paradise n.d.', 'Tang Paradise official visitor channel \(n\.d\.\)', '^Tang Paradise\. \(n\.d\.\)'),
        @('Palace Museum n.d.', 'The Palace Museum official visitor information \(n\.d\.\)', '^The Palace Museum\. \(n\.d\.\)'),
        @('Trip.com n.d.-a', 'Trip\.com, n\.d\.-a', '^Trip\.com\. \(n\.d\.-a\)'),
        @('Trip.com n.d.-b', 'Trip\.com, n\.d\.-b', '^Trip\.com\. \(n\.d\.-b\)'),
        @('Trip.com n.d.-c', 'Trip\.com, n\.d\.-c', '^Trip\.com\. \(n\.d\.-c\)'),
        @('Trip.com n.d.-d', 'n\.d\.-b, n\.d\.-d', '^Trip\.com\. \(n\.d\.-d\)'),
        @('Trip.com n.d.-e', 'n\.d\.-a, n\.d\.-e', '^Trip\.com\. \(n\.d\.-e\)'),
        @('Universal Beijing n.d.', 'Universal Beijing Resort official Tickets & Offers page \(n\.d\.\)', '^Universal Beijing Resort\. \(n\.d\.\)')
    )

    $missing = @()
    $unused = @()
    foreach ($check in $checks) {
        if ($usageText -notmatch $check[1]) { $missing += $check[0] }
        if ($referenceText -notmatch ('(?m)' + $check[2])) { $unused += $check[0] }
    }

    Write-Output "UNIQUE_CITATIONS=$($checks.Count)"
    Write-Output "VERIFIED_REFERENCES=$($referenceTexts.Count)"
    Write-Output "UNRESOLVED_CITATIONS=$([regex]::Matches($usageText, 'Ma et al\.\s*,?\s*\(?2023\)?').Count)"
    Write-Output "MISSING_REFERENCES=$($missing.Count)"
    Write-Output "MISSING_KEYS=$($missing -join ',')"
    Write-Output "UNUSED_REFERENCES=$($unused.Count)"
    Write-Output "UNUSED_KEYS=$($unused -join ',')"
} finally { $zip.Dispose() }
