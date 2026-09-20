$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$targetPath = 'C:\Users\G16\Downloads\Nuogo_FYP_Final_Report_Chapter1-3_SUBMISSION_READY.docx'
$workingPath = 'C:\Users\G16\Downloads\Nuogo_SUBMISSION_READY_finalizing.docx'
$checkpointPath = 'C:\Users\G16\Downloads\Nuogo_SUBMISSION_READY_before_final_placement.docx'

$w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
$r = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
$relNs = 'http://schemas.openxmlformats.org/package/2006/relationships'

function Get-ParagraphText {
    param([Parameter(Mandatory)] $Paragraph, [Parameter(Mandatory)] $NamespaceManager)
    return (($Paragraph.SelectNodes('.//w:t', $NamespaceManager) | ForEach-Object { $_.InnerText }) -join '')
}

function Set-ParagraphText {
    param(
        [Parameter(Mandatory)] $Paragraph,
        [Parameter(Mandatory)] [string] $Text,
        [Parameter(Mandatory)] $Document,
        [Parameter(Mandatory)] $NamespaceManager
    )

    $pPr = $Paragraph.SelectSingleNode('./w:pPr', $NamespaceManager)
    foreach ($child in @($Paragraph.ChildNodes)) {
        if ($child -ne $pPr) {
            $Paragraph.RemoveChild($child) | Out-Null
        }
    }

    $run = $Document.CreateElement('w', 'r', $w)
    $textNode = $Document.CreateElement('w', 't', $w)
    $textNode.InnerText = $Text
    $run.AppendChild($textNode) | Out-Null
    $Paragraph.AppendChild($run) | Out-Null
}

function New-StyleProperty {
    param([Parameter(Mandatory)] $Document, [Parameter(Mandatory)] [string] $Style)
    $pPr = $Document.CreateElement('w', 'pPr', $w)
    $pStyle = $Document.CreateElement('w', 'pStyle', $w)
    $value = $Document.CreateAttribute('w', 'val', $w)
    $value.Value = $Style
    $pStyle.Attributes.Append($value) | Out-Null
    $pPr.AppendChild($pStyle) | Out-Null
    return $pPr
}

function New-TextRun {
    param(
        [Parameter(Mandatory)] $Document,
        [Parameter(Mandatory)] [string] $Text,
        [switch] $HyperlinkStyle
    )

    $run = $Document.CreateElement('w', 'r', $w)
    if ($HyperlinkStyle) {
        $rPr = $Document.CreateElement('w', 'rPr', $w)
        $rStyle = $Document.CreateElement('w', 'rStyle', $w)
        $styleValue = $Document.CreateAttribute('w', 'val', $w)
        $styleValue.Value = 'Hyperlink'
        $rStyle.Attributes.Append($styleValue) | Out-Null
        $rPr.AppendChild($rStyle) | Out-Null
        $run.AppendChild($rPr) | Out-Null
    }

    $textNode = $Document.CreateElement('w', 't', $w)
    if ($Text.StartsWith(' ') -or $Text.EndsWith(' ')) {
        $space = $Document.CreateAttribute('xml', 'space', 'http://www.w3.org/XML/1998/namespace')
        $space.Value = 'preserve'
        $textNode.Attributes.Append($space) | Out-Null
    }
    $textNode.InnerText = $Text
    $run.AppendChild($textNode) | Out-Null
    return $run
}

function Add-HyperlinkRelationship {
    param(
        [Parameter(Mandatory)] $RelationshipsDocument,
        [Parameter(Mandatory)] [string] $Id,
        [Parameter(Mandatory)] [string] $Url
    )

    $relationship = $RelationshipsDocument.CreateElement('Relationship', $relNs)
    $relationship.SetAttribute('Id', $Id)
    $relationship.SetAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')
    $relationship.SetAttribute('Target', $Url)
    $relationship.SetAttribute('TargetMode', 'External')
    $RelationshipsDocument.DocumentElement.AppendChild($relationship) | Out-Null
}

function New-ReferenceParagraph {
    param(
        [Parameter(Mandatory)] $Document,
        [Parameter(Mandatory)] $RelationshipsDocument,
        [Parameter(Mandatory)] [string] $Text,
        [Parameter(Mandatory)] [string] $RelationshipId
    )

    $paragraph = $Document.CreateElement('w', 'p', $w)
    $pPr = New-StyleProperty -Document $Document -Style 'Normal'

    $indent = $Document.CreateElement('w', 'ind', $w)
    $left = $Document.CreateAttribute('w', 'left', $w)
    $left.Value = '720'
    $hanging = $Document.CreateAttribute('w', 'hanging', $w)
    $hanging.Value = '720'
    $indent.Attributes.Append($left) | Out-Null
    $indent.Attributes.Append($hanging) | Out-Null
    $pPr.AppendChild($indent) | Out-Null

    $spacing = $Document.CreateElement('w', 'spacing', $w)
    $after = $Document.CreateAttribute('w', 'after', $w)
    $after.Value = '80'
    $spacing.Attributes.Append($after) | Out-Null
    $pPr.AppendChild($spacing) | Out-Null
    $paragraph.AppendChild($pPr) | Out-Null

    $urlMatch = [regex]::Match($Text, 'https://\S+$')
    if (-not $urlMatch.Success) {
        $paragraph.AppendChild((New-TextRun -Document $Document -Text $Text)) | Out-Null
        return $paragraph
    }

    $prefix = $Text.Substring(0, $urlMatch.Index)
    $url = $urlMatch.Value
    $paragraph.AppendChild((New-TextRun -Document $Document -Text $prefix)) | Out-Null

    Add-HyperlinkRelationship -RelationshipsDocument $RelationshipsDocument -Id $RelationshipId -Url $url
    $hyperlink = $Document.CreateElement('w', 'hyperlink', $w)
    $idAttribute = $Document.CreateAttribute('r', 'id', $r)
    $idAttribute.Value = $RelationshipId
    $hyperlink.Attributes.Append($idAttribute) | Out-Null
    $hyperlink.AppendChild((New-TextRun -Document $Document -Text $url -HyperlinkStyle)) | Out-Null
    $paragraph.AppendChild($hyperlink) | Out-Null
    return $paragraph
}

function New-HeadingParagraph {
    param(
        [Parameter(Mandatory)] $Document,
        [Parameter(Mandatory)] [string] $Text,
        [Parameter(Mandatory)] [string] $Style
    )

    $paragraph = $Document.CreateElement('w', 'p', $w)
    $paragraph.AppendChild((New-StyleProperty -Document $Document -Style $Style)) | Out-Null
    $paragraph.AppendChild((New-TextRun -Document $Document -Text $Text)) | Out-Null
    return $paragraph
}

function New-PageBreakParagraph {
    param([Parameter(Mandatory)] $Document)
    $paragraph = $Document.CreateElement('w', 'p', $w)
    $run = $Document.CreateElement('w', 'r', $w)
    $break = $Document.CreateElement('w', 'br', $w)
    $type = $Document.CreateAttribute('w', 'type', $w)
    $type.Value = 'page'
    $break.Attributes.Append($type) | Out-Null
    $run.AppendChild($break) | Out-Null
    $paragraph.AppendChild($run) | Out-Null
    return $paragraph
}

if (-not (Test-Path -LiteralPath $targetPath)) {
    throw "Current recovered report not found: $targetPath"
}

Copy-Item -LiteralPath $targetPath -Destination $checkpointPath -Force
Copy-Item -LiteralPath $targetPath -Destination $workingPath -Force

$academicReferences = @(
    'Banerjee, A., Satish, A., & Wörndl, W. (2025). Enhancing tourism recommender systems for sustainable city trips using retrieval-augmented generation. In Recommender systems for sustainability and social good (pp. 19-34). Springer. https://doi.org/10.1007/978-3-031-87654-7_3',
    'Dwivedi, Y. K., Pandey, N., Currie, W., & Micu, A. (2024). Leveraging ChatGPT and other generative artificial intelligence (AI)-based applications in the hospitality and tourism industry: Practices, challenges and research agenda. International Journal of Contemporary Hospitality Management, 36(1), 1-12. https://doi.org/10.1108/IJCHM-05-2023-0686',
    'Hao, Y., Chen, Y., Zhang, Y., & Fan, C. (2024). Large language models can solve real-world planning rigorously with formal verification tools. arXiv. https://arxiv.org/abs/2404.11891',
    'Jiang, C., Wang, J., Ma, W., Clarke, C. L. A., Wang, S., Wu, C., & Zhang, M. (2025). Beyond utility: Evaluating LLM as recommender. In Proceedings of the ACM Web Conference 2025 (pp. 3850-3862). Association for Computing Machinery. https://doi.org/10.1145/3696410.3714759',
    'Liu, N., Xu, Q., & Gao, M. (2024). Digital transformation and tourism listed firm performance in COVID-19 shock. Finance Research Letters, 63, 105398. https://doi.org/10.1016/j.frl.2024.105398',
    'Mishra, A., & Alzoubi, Y. I. (2023). Structured software development versus agile software development: A comparative analysis. International Journal of System Assurance Engineering and Management, 14(4), 1504-1522. https://doi.org/10.1007/s13198-023-01958-5',
    'Qi, J., Yan, S., Zhang, Y., Zhang, W., Jin, R., Hu, Y., & Wang, K. (2024). RAG-optimized Tibetan tourism LLMs: Enhancing accuracy and personalization. arXiv. https://arxiv.org/abs/2408.12003',
    'Solano-Barliza, A., Arregocés-Julio, I., Aarón-Gonzalvez, M., Zamora-Musa, R., De-La-Hoz-Franco, E., Escorcia-Gutierrez, J., & Acosta-Coll, M. (2024). Recommender systems applied to the tourism industry: A literature review. Cogent Business & Management, 11(1), 2367088. https://doi.org/10.1080/23311975.2024.2367088',
    'Stankov, U., & Gretzel, U. (2020). Tourism 4.0 technologies and tourist experiences: A human-centered design perspective. Information Technology & Tourism, 22(3), 477-488. https://doi.org/10.1007/s40558-020-00186-y',
    'Xie, J., Zhang, K., Chen, J., Zhu, T., Lou, R., Tian, Y., Xiao, Y., & Su, Y. (2024). TravelPlanner: A benchmark for real-world planning with language agents. International Conference on Learning Representations. https://arxiv.org/abs/2402.01622',
    'Yahya, N., & Maidin, S. S. (2022). The waterfall model with agile scrum as the hybrid agile model for the software engineering team. In 2022 10th International Conference on Cyber and IT Service Management (pp. 1-5). IEEE. https://doi.org/10.1109/CITSM56380.2022.9936036'
)

$tableReferences = @(
    'Air China. (2026, April 15). [Fly to Xi''an] Exclusive Tang Paradise attraction and performance offers for Air China passengers. https://webresource.airchina.com.cn/zh-CN/content/c/2026-04-15/29047.shtml',
    "Beijing Municipal People's Government. (2025, April 23). About subway fares. https://english.beijing.gov.cn/specials/beijinglifeonthesubway/noticeforpassengers/202504/t20250423_4072294.html",
    'China Railway 12306. (n.d.). Ticket fare query. Retrieved August 31, 2026, from https://kyfw.12306.cn/otn/leftTicketPrice/init',
    "Emperor Qinshihuang's Mausoleum Site Museum. (n.d.). Tickets. Retrieved August 31, 2026, from https://www.bmy.com.cn/jingtai/bmyweb/ticketing.html",
    'Leona. (2026a, June 8). Shanghai food guide 2026: What to eat in Shanghai. Trip.com. https://sg.trip.com/guide/food/what-to-eat-in-shanghai.html',
    "Leona. (2026b, January 16). Xi'an food guide 2026: What to eat in Xi'an. Trip.com. https://sg.trip.com/guide/food/what-to-eat-in-xian.html",
    'Robin. (2026, August 7). Beijing Duck (2026): Best Peking Duck restaurants in Beijing. Trip.com. https://www.trip.com/guide/food/beijing-duck.html',
    "Shaanxi Rail Transit Group. (2024, October 29). How are fares calculated using the Xi'an Metro app ride code? https://shxgdjt.com/news/info/120",
    "Shanghai Municipal People's Government. (2025, September 11). Shanghai Tourism Festival: Discounts and free entry to attractions! https://english.shanghai.gov.cn/en-FestivalsCelebrations/20250911/9502fe309abc41a9a2f61966e5725b6a.html",
    "Shanghai Municipal People's Government. (2026a, August 13). How to take metro in Shanghai. https://english.shanghai.gov.cn/en-Individuals-Transportation-Metro/20260813/f257d5c373db4da3a8bde717b9f46b27.html",
    "Shanghai Municipal People's Government. (2026b, May 15). Shanghai at half price: China Tourism Day deals you can't miss. https://english.shanghai.gov.cn/en-FestivalsCelebrations/20260515/ee03e0a7bc6e4d87acc0a1cbe5d8ca49.html",
    'Tang Paradise. (n.d.). Tang Paradise official visitor channel. Retrieved August 31, 2026, from https://www.tangparadise.cn/',
    'The Palace Museum. (n.d.). Visit. Retrieved August 31, 2026, from https://intl.dpm.org.cn/visit.html?_wap=1',
    'Trip.com. (n.d.-a). HanTing Hotel (Beijing Wangfujing). Retrieved August 31, 2026, from https://www.trip.com/hotels/beijing-hotel-detail-1193485/hanting-hotel/',
    'Trip.com. (n.d.-b). Metropolo Xin Cheng Hotel, the Bund Shanghai. Retrieved August 31, 2026, from https://www.trip.com/hotels/shanghai-hotel-detail-536088/metropolo-xin-cheng-hotel-the-bund-shanghai/',
    'Trip.com. (n.d.-c). New Sanjiangyuan Hotel. Retrieved August 31, 2026, from https://www.trip.com/hotels/xi-an-hotel-detail-104448598/new-sanjiangyuan-hotel/',
    'Trip.com. (n.d.-d). Regent Shanghai on the Bund. Retrieved August 31, 2026, from https://www.trip.com/hotels/shanghai-north-bund-tourist-resort-hotel-detail-115585710/regent-shanghai-on-the-bund/',
    'Trip.com. (n.d.-e). The Peninsula Beijing. Retrieved August 31, 2026, from https://www.trip.com/hotels/beijing-hotel-detail-374792/the-peninsula-beijing/',
    'Universal Beijing Resort. (n.d.). Tickets & offers. Retrieved August 31, 2026, from https://www.universalbeijingresort.com/en/tickets-offers'
)

$file = [IO.File]::Open($workingPath, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($file, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $documentEntry = $archive.GetEntry('word/document.xml')
    $reader = New-Object IO.StreamReader($documentEntry.Open())
    [xml] $documentXml = $reader.ReadToEnd()
    $reader.Close()

    $relationshipsEntry = $archive.GetEntry('word/_rels/document.xml.rels')
    $reader = New-Object IO.StreamReader($relationshipsEntry.Open())
    [xml] $relationshipsXml = $reader.ReadToEnd()
    $reader.Close()

    $ns = New-Object Xml.XmlNamespaceManager($documentXml.NameTable)
    $ns.AddNamespace('w', $w)
    $body = $documentXml.SelectSingleNode('//w:body', $ns)

    $middleHeading = $documentXml.SelectNodes('//w:p', $ns) | Where-Object {
        (Get-ParagraphText -Paragraph $_ -NamespaceManager $ns) -eq 'References for Table 3.11'
    } | Select-Object -First 1
    if (-not $middleHeading) {
        throw 'Recovered middle reference heading was not found.'
    }

    $node = $middleHeading
    $removed = 0
    while ($node) {
        $next = $node.NextSibling
        $text = if ($node.LocalName -eq 'p') { Get-ParagraphText -Paragraph $node -NamespaceManager $ns } else { '' }
        if ($text -eq '3.6.5 Use Case Diagram') {
            break
        }
        $node.ParentNode.RemoveChild($node) | Out-Null
        $removed++
        $node = $next
    }
    if ($removed -ne 20) {
        throw "Expected to relocate 20 reference paragraphs; removed $removed."
    }

    $sourceNote = $documentXml.SelectNodes('//w:p', $ns) | Where-Object {
        (Get-ParagraphText -Paragraph $_ -NamespaceManager $ns).StartsWith('Source note: Table 3.11 contains maintained planning references')
    } | Select-Object -First 1
    if (-not $sourceNote) { throw 'Updated Table 3.11 source note was not found.' }
    Set-ParagraphText -Paragraph $sourceNote -Document $documentXml -NamespaceManager $ns -Text 'Source note: The values are maintained planning references derived from publicly available indicative information. They are not live quotations and may vary by season, availability, provider, and traveller choice. Supporting sources are listed in the References section.'

    $accommodationParagraph = $documentXml.SelectNodes('//w:p', $ns) | Where-Object {
        (Get-ParagraphText -Paragraph $_ -NamespaceManager $ns).StartsWith('Accommodation anchors are based on named Trip.com')
    } | Select-Object -First 1
    if (-not $accommodationParagraph) { throw 'Accommodation reliability paragraph was not found.' }
    Set-ParagraphText -Paragraph $accommodationParagraph -Document $documentXml -NamespaceManager $ns -Text "Accommodation anchors are Nuogo-prepared planning references informed by named Trip.com public hotel listings accessed on 31 August 2026. The selected listings illustrate traceable examples and do not establish city-wide room rates. Local-transport references use published fare policies from Beijing, Shanghai, and Xi'an transport authorities. Intercity railway values are indicative route-planning ranges; the China Railway 12306 fare-query service remains the primary source for confirming the actual route and travel-date fare."

    $sectionProperties = $body.SelectSingleNode('./w:sectPr', $ns)
    if (-not $sectionProperties) { throw 'Final section properties were not found.' }

    $body.InsertBefore((New-PageBreakParagraph -Document $documentXml), $sectionProperties) | Out-Null
    $body.InsertBefore((New-HeadingParagraph -Document $documentXml -Text 'REFERENCES' -Style 'Heading1'), $sectionProperties) | Out-Null
    $body.InsertBefore((New-HeadingParagraph -Document $documentXml -Text 'Academic literature' -Style 'Heading2'), $sectionProperties) | Out-Null

    $relationshipCounter = 1
    foreach ($reference in $academicReferences) {
        $id = "rIdNuogoReference$relationshipCounter"
        $body.InsertBefore((New-ReferenceParagraph -Document $documentXml -RelationshipsDocument $relationshipsXml -Text $reference -RelationshipId $id), $sectionProperties) | Out-Null
        $relationshipCounter++
    }

    $body.InsertBefore((New-HeadingParagraph -Document $documentXml -Text 'Technical and official web sources' -Style 'Heading2'), $sectionProperties) | Out-Null
    foreach ($reference in $tableReferences) {
        $id = "rIdNuogoReference$relationshipCounter"
        $body.InsertBefore((New-ReferenceParagraph -Document $documentXml -RelationshipsDocument $relationshipsXml -Text $reference -RelationshipId $id), $sectionProperties) | Out-Null
        $relationshipCounter++
    }

    $documentEntry.Delete()
    $newDocumentEntry = $archive.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newDocumentEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $documentXml.Save($writer)
    $writer.Close()

    $relationshipsEntry.Delete()
    $newRelationshipsEntry = $archive.CreateEntry('word/_rels/document.xml.rels', [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newRelationshipsEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $relationshipsXml.Save($writer)
    $writer.Close()
}
finally {
    $archive.Dispose()
    $file.Dispose()
}

# Structural preflight before replacing the recovered checkpoint.
$check = [IO.Compression.ZipFile]::OpenRead($workingPath)
try {
    $entries = $check.Entries.FullName
    foreach ($required in @('[Content_Types].xml', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/styles.xml', 'word/numbering.xml')) {
        if ($entries -notcontains $required) { throw "Missing required DOCX part: $required" }
    }
    $reader = New-Object IO.StreamReader($check.GetEntry('word/document.xml').Open())
    [xml] $checkXml = $reader.ReadToEnd()
    $reader.Close()
    $checkNs = New-Object Xml.XmlNamespaceManager($checkXml.NameTable)
    $checkNs.AddNamespace('w', $w)
    if ($checkXml.SelectNodes('//w:tbl', $checkNs).Count -ne 20) { throw 'Table count changed during finalization.' }
    if ($checkXml.SelectNodes('//w:drawing', $checkNs).Count -ne 19) { throw 'Figure drawing count changed during finalization.' }
    $plainText = ($checkXml.SelectNodes('//w:t', $checkNs) | ForEach-Object { $_.InnerText }) -join ' '
    if (-not $plainText.Contains('REFERENCES')) { throw 'Final References heading is missing.' }
    if ($plainText.Contains('References for Table 3.11')) { throw 'Middle-of-Chapter reference list was not fully removed.' }
    if (-not $plainText.Contains('Trip.com, n.d.-a, n.d.-e')) { throw 'Table 3.11 source citations are missing.' }
} finally {
    $check.Dispose()
}

Move-Item -LiteralPath $workingPath -Destination $targetPath -Force

Write-Output "Finalized: $targetPath"
Write-Output "Checkpoint: $checkpointPath"
Write-Output "Academic references added: $($academicReferences.Count)"
Write-Output "Table 3.11 supporting references added: $($tableReferences.Count)"
Write-Output "SHA256: $((Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash)"
