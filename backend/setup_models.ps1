[CmdletBinding()]
param(
    [string]$Python = "python"
)
$ErrorActionPreference = "Stop"

# This script only downloads model assets when you run it; the coding agent does not run it.
# It is safe to rerun: huggingface_hub reuses the local snapshot cache/content.
$ModelRoot = Join-Path $PSScriptRoot "models"
New-Item -ItemType Directory -Force -Path $ModelRoot | Out-Null

function Download-HuggingFaceAsset([string]$Name, [string]$Repo, [string]$Directory) {
    $target = Join-Path $ModelRoot $Directory
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Write-Host "[$Name] downloading/checking $Repo -> $target"
    & $Python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='$Repo', local_dir=r'$target', local_dir_use_symlinks=False)"
    if ($LASTEXITCODE -ne 0) { throw "[$Name] download failed with exit code $LASTEXITCODE" }
    Write-Host "[$Name] ready"
}

Download-HuggingFaceAsset "faster-whisper tiny" "Systran/faster-whisper-tiny" "faster-whisper-tiny"
Download-HuggingFaceAsset "faster-whisper base" "Systran/faster-whisper-base" "faster-whisper-base"
Download-HuggingFaceAsset "silero-vad" "snakers4/silero-vad" "silero-vad"
# Open sherpa-onnx Piper voice source: https://huggingface.co/csukuangfj/sherpa-onnx-vits-piper-en_US-lessac-medium
Download-HuggingFaceAsset "sherpa-onnx TTS voice" "csukuangfj/sherpa-onnx-vits-piper-en_US-lessac-medium" "sherpa-tts-lessac"

$Yamnet = Join-Path $ModelRoot "yamnet"
New-Item -ItemType Directory -Force -Path $Yamnet | Out-Null
$YamnetArchive = Join-Path $Yamnet "yamnet.tar.gz"
Write-Host "[yamnet] downloading/checking TensorFlow Hub asset -> $Yamnet"
if (-not (Test-Path $YamnetArchive)) {
    & $Python -c "from urllib.request import urlretrieve; urlretrieve('https://tfhub.dev/google/yamnet/1?tf-hub-format=compressed', r'$YamnetArchive')"
    if ($LASTEXITCODE -ne 0) { throw "[yamnet] download failed with exit code $LASTEXITCODE" }
}
Write-Host "[yamnet] ready (archive: $YamnetArchive)"
Write-Host "All requested model assets are present or cached under $ModelRoot."
