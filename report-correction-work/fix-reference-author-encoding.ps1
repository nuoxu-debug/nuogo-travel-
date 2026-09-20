$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

$path = 'C:\Users\G16\Downloads\Nuogo_SUBMISSION_READY_finalizing.docx'
$file = [IO.File]::Open($path, [IO.FileMode]::Open, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
$archive = New-Object IO.Compression.ZipArchive($file, [IO.Compression.ZipArchiveMode]::Update, $false)
try {
    $entry = $archive.GetEntry('word/document.xml')
    $reader = New-Object IO.StreamReader($entry.Open(), [Text.Encoding]::UTF8)
    $text = $reader.ReadToEnd()
    $reader.Close()

    $correctWordl = 'W' + [char]0x00F6 + 'rndl'
    $correctArregoces = 'Arregoc' + [char]0x00E9 + 's-Julio'
    $correctAaron = 'Aar' + [char]0x00F3 + 'n-Gonzalvez'

    $text = $text.Replace('W' + [char]0x679A + 'rndl', $correctWordl)
    $text = $text.Replace('Arregoc' + [char]0x8305 + 's-Julio', $correctArregoces)
    $text = $text.Replace('Aar' + [char]0x8D38 + 'n-Gonzalvez', $correctAaron)

    if (-not $text.Contains($correctWordl) -or -not $text.Contains($correctArregoces) -or -not $text.Contains($correctAaron)) {
        throw 'Expected corrected author spellings were not all present.'
    }

    $entry.Delete()
    $newEntry = $archive.CreateEntry('word/document.xml', [IO.Compression.CompressionLevel]::Optimal)
    $writer = New-Object IO.StreamWriter($newEntry.Open(), (New-Object Text.UTF8Encoding($false)))
    $writer.Write($text)
    $writer.Close()
} finally {
    $archive.Dispose()
    $file.Dispose()
}

Write-Output 'Corrected three accented author-name encodings.'
