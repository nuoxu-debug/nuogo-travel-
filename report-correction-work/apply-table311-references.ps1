$ErrorActionPreference = 'Stop'

$sourcePath = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_FINAL_READY.docx'
$outputPath = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_SUBMISSION_READY.docx'

function Set-CellText {
    param(
        [Parameter(Mandatory)] $Cell,
        [Parameter(Mandatory)] [string] $Text
    )

    $range = $Cell.Range.Duplicate
    $range.End = $range.End - 1
    $range.Text = $Text
}

function Find-Paragraph {
    param(
        [Parameter(Mandatory)] $Document,
        [Parameter(Mandatory)] [string] $Needle
    )

    foreach ($paragraph in $Document.Paragraphs) {
        $text = ($paragraph.Range.Text -replace '[\r\a]', '').Trim()
        if ($text.Contains($Needle)) {
            return $paragraph
        }
    }

    throw "Paragraph not found: $Needle"
}

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source report not found: $sourcePath"
}

$sourceHashBefore = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
Copy-Item -LiteralPath $sourcePath -Destination $outputPath -Force

$word = $null
$document = $null

try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($outputPath, $false, $false)

    if ($document.Tables.Count -ne 20) {
        throw "Expected 20 tables before editing; found $($document.Tables.Count)."
    }

    $table = $document.Tables.Item(20)
    $caption = (Find-Paragraph -Document $document -Needle 'Table 3.11 Prepared Budget Reference Dataset').Range.Text
    if (-not $caption) {
        throw 'Table 3.11 caption was not found.'
    }

    $rows = @(
        @('Beijing - Accommodation', 'Trip.com public listings: HanTing Hotel (Beijing Wangfujing) and The Peninsula Beijing (Trip.com, n.d.-a, n.d.-e).', 'Nuogo-prepared indicative anchors: approximately CNY 140 / 600 / 2,344 per room-night for budget, mid-range, and premium planning; these are not live quotations.', 'Public listings accessed 31 August 2026; dynamic prices must be refreshed before scenario use.'),
        @('Shanghai - Accommodation', 'Trip.com public listings: Metropolo Xin Cheng Hotel and Regent Shanghai on the Bund (Trip.com, n.d.-b, n.d.-d).', 'Nuogo-prepared indicative anchors: approximately CNY 288 / 800 / 2,668 per room-night for budget, mid-range, and premium planning; these are not live quotations.', 'Public listings accessed 31 August 2026; dynamic prices must be refreshed before scenario use.'),
        @("Xi'an - Accommodation", 'Trip.com public listing: New Sanjiangyuan Hotel (Trip.com, n.d.-c); additional tier values are Nuogo planning anchors.', 'Nuogo-prepared indicative anchors: approximately CNY 148 / 364 / 544 per room-night for budget, mid-range, and premium planning; these are not live quotations.', 'Public listing accessed 31 August 2026; dynamic prices must be refreshed before scenario use.'),
        @('Beijing - Local transportation', "Beijing Municipal People's Government / Beijing Subway (2025).", 'Published standard fare reference: CNY 3 up to 6 km; CNY 4 for 6-12 km; CNY 5 for 12-22 km; CNY 6 for 22-32 km; then CNY 1 per additional 20 km.', 'Official source accessed 31 August 2026; recheck before use.'),
        @('Shanghai - Local transportation', "Shanghai Municipal People's Government (2026a).", 'Published city-metro fare reference: CNY 3 up to 6 km, then CNY 1 per additional 10 km; suburban lines may use separate fare mechanisms.', 'Official source accessed 31 August 2026; recheck before use.'),
        @("Xi'an - Local transportation", "Shaanxi Rail Transit Group / Xi'an Metro (2024).", 'Published fare reference: CNY 2 for 0-6 km; CNY 3 for 6-10 km; CNY 4 for 10-14 km; CNY 5 for 14-20 km; CNY 6 for 20-26 km; then CNY 1 per additional 8 km.', 'Official operator source accessed 31 August 2026; recheck before use.'),
        @('Beijing-Shanghai - Intercity railway', 'China Railway 12306 official fare-query service (n.d.).', 'Prepared indicative second-class planning range: approximately CNY 576-697. This is not a live fare; the actual route and travel-date fare must be queried on 12306.', 'Official query accessed 31 August 2026; query the actual travel date.'),
        @("Beijing-Xi'an - Intercity railway", 'China Railway 12306 official fare-query service (n.d.).', 'Prepared indicative second-class planning range: approximately CNY 480-593. This is not a live fare; the actual route and travel-date fare must be queried on 12306.', 'Official query accessed 31 August 2026; query the actual travel date.'),
        @("Shanghai-Xi'an - Intercity railway", 'China Railway 12306 official fare-query service (n.d.).', 'Prepared indicative second-class planning range: approximately CNY 652-795. This is not a live fare; the actual route and travel-date fare must be queried on 12306.', 'Official query accessed 31 August 2026; query the actual travel date.'),
        @('Beijing - Food', 'Trip.com Beijing Duck guide and named sample restaurants (Robin, 2026).', 'Nuogo-prepared indicative daily tiers: CNY 80-150 / 150-300 / 300-450 per traveller-day, informed by varied sample meal prices rather than a guaranteed daily spend.', 'Guide accessed 31 August 2026; indicative only; review within three months.'),
        @('Shanghai - Food', 'Trip.com Shanghai Food Guide and named sample restaurants (Leona, 2026a).', 'Nuogo-prepared indicative daily tiers: CNY 60-120 / 120-220 / 220-350 per traveller-day, informed by varied sample meal prices rather than a guaranteed daily spend.', 'Guide accessed 31 August 2026; indicative only; review within three months.'),
        @("Xi'an - Food", "Trip.com Xi'an Food Guide and named sample restaurants (Leona, 2026b).", 'Nuogo-prepared indicative daily tiers: CNY 50-100 / 100-180 / 180-260 per traveller-day, informed by varied sample meal prices rather than a guaranteed daily spend.', 'Guide accessed 31 August 2026; indicative only; review within three months.'),
        @('Beijing - Attraction tickets', 'The Palace Museum official visitor information (n.d.).', 'Published general-admission reference: CNY 60 in peak season and CNY 40 in low season; Treasure Gallery and Clock and Watch Gallery are CNY 10 each. Reservation and eligibility rules must be checked.', 'Official source accessed 31 August 2026; recheck before visiting.'),
        @('Shanghai - Attraction tickets', "Shanghai Municipal People's Government, Shanghai Tower tourism notice (2026b).", 'Published regular-admission reference: CNY 180 for a standard adult ticket. Concessions and promotional prices may vary.', 'Official government source accessed 31 August 2026; recheck before visiting.'),
        @("Xi'an - Attraction tickets", "Emperor Qinshihuang's Mausoleum Site Museum official ticket information (n.d.).", 'Published admission reference: CNY 120 for an adult and CNY 60 for eligible students; reservation, concession, and free-admission rules apply.', 'Official attraction source accessed 31 August 2026; recheck before visiting.'),
        @('Beijing - Entertainment', 'Universal Beijing Resort official Tickets & Offers page (n.d.).', 'A dated one-day ticket is advertised from CNY 350. Prices depend on the selected date and must be checked in the official price calendar.', 'Official venue source accessed 31 August 2026; recheck for the selected date.'),
        @('Shanghai - Entertainment', "Shanghai Municipal People's Government tourism-festival notice (2025).", 'Published regular adult reference: CNY 260 for Shanghai Happy Valley. Promotional and date-specific prices may vary.', 'Official government source accessed 31 August 2026; recheck before visiting.'),
        @("Xi'an - Entertainment", 'Tang Paradise official visitor channel (n.d.) and Air China partner offer (2026).', 'Indicative adult gate-price reference: CNY 120. Shows are separate and variable; confirm the current price through the official venue channel.', 'Official venue and partner sources accessed 31 August 2026; recheck before visiting.'),
        @('All cities - Miscellaneous reserve', 'Nuogo system-defined planning reserve; no external market-price citation is claimed.', 'CNY 30-100 per traveller-day, applied only as an estimated planning reserve.', 'Defined for the prepared evaluation dataset; review when the planning policy changes.')
    )

    if ($table.Rows.Count -ne ($rows.Count + 1)) {
        throw "Expected $($rows.Count + 1) rows in Table 3.11; found $($table.Rows.Count)."
    }

    for ($i = 0; $i -lt $rows.Count; $i++) {
        for ($column = 0; $column -lt 4; $column++) {
            Set-CellText -Cell $table.Cell($i + 2, $column + 1) -Text $rows[$i][$column]
        }
    }

    $sourceNote = Find-Paragraph -Document $document -Needle 'Source note: The prepared values draw on'
    $sourceNoteRange = $sourceNote.Range.Duplicate
    $sourceNoteRange.End = $sourceNoteRange.End - 1
    $sourceNoteRange.Text = 'Source note: Table 3.11 contains maintained planning references rather than live quotations. Accommodation and food figures are indicative tier anchors informed by named public samples; transport, attraction, and entertainment figures use the cited published sources. Market values and rules may change, so sources should be rechecked before use. Full source details appear in the reference list below.'

    $reliabilityParagraph = Find-Paragraph -Document $document -Needle 'Different travel-cost categories use different reference methods.'
    $references = @(
        @{ Text = 'Air China. (2026, April 15). [Fly to Xi''an] Exclusive Tang Paradise attraction and performance offers for Air China passengers. https://webresource.airchina.com.cn/zh-CN/content/c/2026-04-15/29047.shtml'; Url = 'https://webresource.airchina.com.cn/zh-CN/content/c/2026-04-15/29047.shtml' },
        @{ Text = "Beijing Municipal People's Government. (2025, April 23). About subway fares. https://english.beijing.gov.cn/specials/beijinglifeonthesubway/noticeforpassengers/202504/t20250423_4072294.html"; Url = 'https://english.beijing.gov.cn/specials/beijinglifeonthesubway/noticeforpassengers/202504/t20250423_4072294.html' },
        @{ Text = 'China Railway 12306. (n.d.). Ticket fare query. Retrieved August 31, 2026, from https://kyfw.12306.cn/otn/leftTicketPrice/init'; Url = 'https://kyfw.12306.cn/otn/leftTicketPrice/init' },
        @{ Text = "Emperor Qinshihuang's Mausoleum Site Museum. (n.d.). Tickets. Retrieved August 31, 2026, from https://www.bmy.com.cn/jingtai/bmyweb/ticketing.html"; Url = 'https://www.bmy.com.cn/jingtai/bmyweb/ticketing.html' },
        @{ Text = 'Leona. (2026a, June 8). Shanghai food guide 2026: What to eat in Shanghai. Trip.com. https://sg.trip.com/guide/food/what-to-eat-in-shanghai.html'; Url = 'https://sg.trip.com/guide/food/what-to-eat-in-shanghai.html' },
        @{ Text = "Leona. (2026b, January 16). Xi'an food guide 2026: What to eat in Xi'an. Trip.com. https://sg.trip.com/guide/food/what-to-eat-in-xian.html"; Url = 'https://sg.trip.com/guide/food/what-to-eat-in-xian.html' },
        @{ Text = 'Robin. (2026, August 7). Beijing Duck (2026): Best Peking Duck restaurants in Beijing. Trip.com. https://www.trip.com/guide/food/beijing-duck.html'; Url = 'https://www.trip.com/guide/food/beijing-duck.html' },
        @{ Text = 'Shaanxi Rail Transit Group. (2024, October 29). How are fares calculated using the Xi''an Metro app ride code? https://shxgdjt.com/news/info/120'; Url = 'https://shxgdjt.com/news/info/120' },
        @{ Text = "Shanghai Municipal People's Government. (2025, September 11). Shanghai Tourism Festival: Discounts and free entry to attractions! https://english.shanghai.gov.cn/en-FestivalsCelebrations/20250911/9502fe309abc41a9a2f61966e5725b6a.html"; Url = 'https://english.shanghai.gov.cn/en-FestivalsCelebrations/20250911/9502fe309abc41a9a2f61966e5725b6a.html' },
        @{ Text = "Shanghai Municipal People's Government. (2026a, August 13). How to take metro in Shanghai. https://english.shanghai.gov.cn/en-Individuals-Transportation-Metro/20260813/f257d5c373db4da3a8bde717b9f46b27.html"; Url = 'https://english.shanghai.gov.cn/en-Individuals-Transportation-Metro/20260813/f257d5c373db4da3a8bde717b9f46b27.html' },
        @{ Text = "Shanghai Municipal People's Government. (2026b, May 15). Shanghai at half price: China Tourism Day deals you can't miss. https://english.shanghai.gov.cn/en-FestivalsCelebrations/20260515/ee03e0a7bc6e4d87acc0a1cbe5d8ca49.html"; Url = 'https://english.shanghai.gov.cn/en-FestivalsCelebrations/20260515/ee03e0a7bc6e4d87acc0a1cbe5d8ca49.html' },
        @{ Text = 'Tang Paradise. (n.d.). Tang Paradise official visitor channel. Retrieved August 31, 2026, from https://www.tangparadise.cn/'; Url = 'https://www.tangparadise.cn/' },
        @{ Text = 'The Palace Museum. (n.d.). Visit. Retrieved August 31, 2026, from https://intl.dpm.org.cn/visit.html?_wap=1'; Url = 'https://intl.dpm.org.cn/visit.html?_wap=1' },
        @{ Text = 'Trip.com. (n.d.-a). HanTing Hotel (Beijing Wangfujing). Retrieved August 31, 2026, from https://www.trip.com/hotels/beijing-hotel-detail-1193485/hanting-hotel/'; Url = 'https://www.trip.com/hotels/beijing-hotel-detail-1193485/hanting-hotel/' },
        @{ Text = 'Trip.com. (n.d.-b). Metropolo Xin Cheng Hotel, the Bund Shanghai. Retrieved August 31, 2026, from https://www.trip.com/hotels/shanghai-hotel-detail-536088/metropolo-xin-cheng-hotel-the-bund-shanghai/'; Url = 'https://www.trip.com/hotels/shanghai-hotel-detail-536088/metropolo-xin-cheng-hotel-the-bund-shanghai/' },
        @{ Text = 'Trip.com. (n.d.-c). New Sanjiangyuan Hotel. Retrieved August 31, 2026, from https://www.trip.com/hotels/xi-an-hotel-detail-104448598/new-sanjiangyuan-hotel/'; Url = 'https://www.trip.com/hotels/xi-an-hotel-detail-104448598/new-sanjiangyuan-hotel/' },
        @{ Text = 'Trip.com. (n.d.-d). Regent Shanghai on the Bund. Retrieved August 31, 2026, from https://www.trip.com/hotels/shanghai-north-bund-tourist-resort-hotel-detail-115585710/regent-shanghai-on-the-bund/'; Url = 'https://www.trip.com/hotels/shanghai-north-bund-tourist-resort-hotel-detail-115585710/regent-shanghai-on-the-bund/' },
        @{ Text = 'Trip.com. (n.d.-e). The Peninsula Beijing. Retrieved August 31, 2026, from https://www.trip.com/hotels/beijing-hotel-detail-374792/the-peninsula-beijing/'; Url = 'https://www.trip.com/hotels/beijing-hotel-detail-374792/the-peninsula-beijing/' },
        @{ Text = 'Universal Beijing Resort. (n.d.). Tickets & offers. Retrieved August 31, 2026, from https://www.universalbeijingresort.com/en/tickets-offers'; Url = 'https://www.universalbeijingresort.com/en/tickets-offers' }
    )

    $blockLines = @('References for Table 3.11') + ($references | ForEach-Object { $_.Text })
    $block = ($blockLines -join "`r") + "`r"
    $insertStart = $reliabilityParagraph.Range.End
    $insertRange = $document.Range($insertStart, $insertStart)
    $insertRange.InsertAfter($block)
    $insertedRange = $document.Range($insertStart, $insertStart + $block.Length)

    $insertedParagraphs = $insertedRange.Paragraphs
    $headingParagraph = $insertedParagraphs.Item(1)
    $headingParagraph.Style = $document.Styles.Item('Heading 4')
    $headingParagraph.Range.Font.Bold = $true

    for ($i = 2; $i -le $insertedParagraphs.Count; $i++) {
        $paragraph = $insertedParagraphs.Item($i)
        $paragraph.Style = $document.Styles.Item('Normal')
        $paragraph.Format.LeftIndent = $word.CentimetersToPoints(0.75)
        $paragraph.Format.FirstLineIndent = $word.CentimetersToPoints(-0.75)
        $paragraph.Format.SpaceAfter = 3
    }

    foreach ($reference in $references) {
        $findRange = $insertedRange.Duplicate
        $find = $findRange.Find
        $find.ClearFormatting()
        $find.Text = $reference.Url
        $find.Forward = $true
        $find.Wrap = 0
        if (-not $find.Execute()) {
            throw "Inserted URL was not found: $($reference.Url)"
        }
        $document.Hyperlinks.Add($findRange, $reference.Url) | Out-Null
    }

    $document.Save()
    $document.Close(0)
    $document = $null
    $word.Quit()
    $word = $null
}
finally {
    if ($document) {
        try { $document.Close(0) } catch {}
    }
    if ($word) {
        try { $word.Quit() } catch {}
    }
}

$sourceHashAfter = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash
if ($sourceHashAfter -ne $sourceHashBefore) {
    throw 'The FINAL_READY source report changed during processing.'
}

Write-Output "Created: $outputPath"
Write-Output "FINAL_READY SHA256: $sourceHashAfter"
Write-Output "SUBMISSION_READY SHA256: $((Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash)"
