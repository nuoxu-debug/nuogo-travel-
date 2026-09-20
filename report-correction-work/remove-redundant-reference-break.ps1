$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$path = 'C:\Users\G16\Downloads\Nuogo_SUBMISSION_READY_finalizing.docx'
$w = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

$file = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($file, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $entry = $archive.GetEntry('word/document.xml')
    $reader = New-Object IO.StreamReader($entry.Open())
    [xml] $xml = $reader.ReadToEnd()
    $reader.Close()

    $ns = New-Object Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace('w', $w)
    $heading = $xml.SelectNodes('//w:body/w:p', $ns) | Where-Object {
        (($_.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '') -eq 'REFERENCES'
    } | Select-Object -First 1
    if (-not $heading) { throw 'REFERENCES heading not found.' }

    $previous = $heading.PreviousSibling
    while ($previous -and $previous.NodeType -ne [Xml.XmlNodeType]::Element) { $previous = $previous.PreviousSibling }
    if (-not $previous.SelectSingleNode('.//w:br[@w:type="page"]', $ns)) {
        throw 'Redundant page-break paragraph not found immediately before REFERENCES.'
    }
    $previous.ParentNode.RemoveChild($previous) | Out-Null

    $entry.Delete()
    $newEntry = $archive.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $xml.Save($writer)
    $writer.Close()
} finally {
    $archive.Dispose()
    $file.Dispose()
}

Write-Output "Removed redundant pre-References page break: $path"
