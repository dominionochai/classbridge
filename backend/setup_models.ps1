[CmdletBinding()]
param(
    [string]$Python = "python"
)
$ErrorActionPreference = "Stop"

# This script downloads model assets only when you run it explicitly.
# Supply sources from the official distributions through environment variables.
$ModelRoot = Join-Path $PSScriptRoot "models"
New-Item -ItemType Directory -Force -Path $ModelRoot | Out-Null

function Download-ModelAsset([string]$Name, [string]$Source, [string]$Directory) {
    $target = Join-Path $ModelRoot $Directory
    if ([string]::IsNullOrWhiteSpace($Source)) {
        Write-Host "[$Name] download model weights from official distribution; source not configured"
        return
    }

    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Write-Host "[$Name] downloading configured model source -> $target"
    & $Python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='$Source', local_dir=r'$target', local_dir_use_symlinks=False)"
    if ($LASTEXITCODE -ne 0) {
        throw "[$Name] download failed with exit code $LASTEXITCODE"
    }
    Write-Host "[$Name] ready"
}

$ModelSources = @(
    @{ Name = "speech recognition tiny"; Source = $env:CLASSBRIDGE_SPEECH_TINY_SOURCE; Directory = "speech-tiny" },
    @{ Name = "speech recognition base"; Source = $env:CLASSBRIDGE_SPEECH_BASE_SOURCE; Directory = "speech-base" },
    @{ Name = "voice activity"; Source = $env:CLASSBRIDGE_VOICE_ACTIVITY_SOURCE; Directory = "voice-activity" },
    @{ Name = "speech synthesis"; Source = $env:CLASSBRIDGE_SPEECH_SYNTHESIS_SOURCE; Directory = "speech-synthesis" }
)

foreach ($model in $ModelSources) {
    Download-ModelAsset $model.Name $model.Source $model.Directory
}

$AudioModelRoot = Join-Path $ModelRoot "audio-classifier"
$AudioModelArchive = Join-Path $AudioModelRoot "model.tar.gz"
New-Item -ItemType Directory -Force -Path $AudioModelRoot | Out-Null
$AudioSource = $env:CLASSBRIDGE_AUDIO_MODEL_SOURCE
if ([string]::IsNullOrWhiteSpace($AudioSource)) {
    Write-Host "[audio classifier] download model weights from official distribution; source not configured"
} elseif (-not (Test-Path $AudioModelArchive)) {
    Write-Host "[audio classifier] downloading configured model source -> $AudioModelArchive"
    Invoke-WebRequest -Uri $AudioSource -OutFile $AudioModelArchive
    if ($LASTEXITCODE -ne 0) {
        throw "[audio classifier] download failed with exit code $LASTEXITCODE"
    }
}
Write-Host "All requested model assets are present or cached under $ModelRoot."
