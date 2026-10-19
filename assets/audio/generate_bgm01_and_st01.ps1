$csCode = Get-Content -Raw -Path "assets/audio/concepts/SoundEngine.cs"

# Check if SoundEngine is already loaded, otherwise compile
if (-not ([System.Management.Automation.PSTypeName]'SoundEngine').Type) {
    Add-Type -TypeDefinition $csCode
}

$SR = [SoundEngine]::SAMPLE_RATE

# Note Frequencies
$notes = @{
    "G1" = 49.00; "A1" = 55.00; "B1" = 61.74;
    "C2" = 65.41; "D2" = 73.42; "E2" = 82.41; "F#2" = 92.50; "G2" = 98.00; "A2" = 110.00; "B2" = 123.47;
    "C3" = 130.81; "D3" = 146.83; "E3" = 164.81; "F#3" = 185.00; "G3" = 196.00; "A3" = 220.00; "B3" = 246.94;
    "C4" = 261.63; "D4" = 293.66; "E4" = 329.63; "F#4" = 369.99; "G4" = 392.00; "A4" = 440.00; "B4" = 493.88;
    "C5" = 523.25; "D5" = 587.33; "E5" = 659.25; "F#5" = 739.99; "G5" = 783.99; "A5" = 880.00; "B5" = 987.77;
    "C6" = 1046.50; "D6" = 1174.66; "E6" = 1318.51; "F#6" = 1479.98; "G6" = 1567.98;
}

# =========================================================================
# 1. BGM-01: bgm_title_forest_departure_loop (60.00s / 26 bars, BPM 104)
# =========================================================================
Write-Host "Rendering BGM-01: bgm_title_forest_departure_loop..."
$bpm = 104.0
$beat = 60.0 / $bpm
$barLen = 4.0 * $beat
$totalBars = 26
$totalSeconds = $totalBars * $barLen # Exactly 60.0 seconds!
$trackLenSamples = [int]($totalSeconds * $SR)
$extraTailSamples = [int](3.0 * $SR) # 3 seconds reverb decay tail for wrapping

# Render buffer with extra tail for seamless wrap
$renderTrack = New-Object SoundEngine+Track($trackLenSamples + $extraTailSamples)

# Chord progression for 26 bars:
# Bars 0-3 (Intro): G, G, C, Dsus4->D
# Bars 4-11 (Theme A): G, C, Em7, D, G, C, Am7-D, G
# Bars 12-19 (Theme B): Em, C, G, D, Em, C, Am7, Dsus4->D
# Bars 20-25 (Theme A Reprise & Loop Out): G, C, Em7, C, Am7-Dsus4, G
$chords = @(
    # Intro
    "G", "G", "C", "D",
    # Theme A
    "G", "C", "Em", "D", "G", "C", "Am", "G",
    # Theme B
    "Em", "C", "G", "D", "Em", "C", "Am", "D",
    # Reprise
    "G", "C", "Em", "C", "Am", "G"
)

$bassRoots = @(
    $notes["G2"], $notes["G2"], $notes["C2"], $notes["D2"],
    $notes["G2"], $notes["C2"], $notes["E2"], $notes["D2"], $notes["G2"], $notes["C2"], $notes["A2"], $notes["G2"],
    $notes["E2"], $notes["C2"], $notes["G2"], $notes["D2"], $notes["E2"], $notes["C2"], $notes["A2"], $notes["D2"],
    $notes["G2"], $notes["C2"], $notes["E2"], $notes["C2"], $notes["A2"], $notes["G2"]
)

# Helper function to get arpeggio pattern based on chord
function Get-Arpeggio($chordName) {
    switch ($chordName) {
        "G"  { return @($notes["G3"], $notes["D4"], $notes["G4"], $notes["B4"], $notes["D5"], $notes["B4"], $notes["G4"], $notes["D4"]) }
        "C"  { return @($notes["C3"], $notes["G3"], $notes["E4"], $notes["G4"], $notes["C5"], $notes["G4"], $notes["E4"], $notes["G3"]) }
        "Em" { return @($notes["E3"], $notes["B3"], $notes["E4"], $notes["G4"], $notes["B4"], $notes["G4"], $notes["E4"], $notes["B3"]) }
        "Am" { return @($notes["A3"], $notes["E4"], $notes["A4"], $notes["C5"], $notes["E5"], $notes["C5"], $notes["A4"], $notes["E4"]) }
        "D"  { return @($notes["D3"], $notes["A3"], $notes["D4"], $notes["F#4"], $notes["A4"], $notes["F#4"], $notes["D4"], $notes["A3"]) }
    }
}

for ($bar = 0; $bar -lt $totalBars; $bar++) {
    $barTime = $bar * $barLen
    $chord = $chords[$bar]
    $root = $bassRoots[$bar]

    # Bass (enters bar 2)
    if ($bar -ge 2) {
        $bassVol = if ($bar -ge 4) { 0.44 } else { 0.32 }
        [SoundEngine]::RenderBass($renderTrack, $barTime, $root, $beat * 3.8, $bassVol)
        if ($bar -ge 12 -and $bar -le 19) {
            # Walking 5th in Theme B
            $fifth = $root * 1.5
            [SoundEngine]::RenderBass($renderTrack, $barTime + 2.0 * $beat, $fifth, $beat * 1.8, 0.36)
        }
    }

    # Percussion
    # Mallet Kick: enters bar 4
    if ($bar -ge 4) {
        [SoundEngine]::RenderMalletKick($renderTrack, $barTime, 0.34)
        [SoundEngine]::RenderMalletKick($renderTrack, $barTime + 2.0 * $beat, 0.28)
    }

    # Shaker & Clave: enters bar 2
    if ($bar -ge 2) {
        for ($b = 0; $b -lt 4; $b++) {
            $t = $barTime + $b * $beat
            [SoundEngine]::RenderShaker($renderTrack, $t, 0.22, -0.35)
            [SoundEngine]::RenderShaker($renderTrack, $t + $beat * 0.5, 0.16, -0.3)
            if ($b -eq 1 -or $b -eq 3) {
                [SoundEngine]::RenderWoodblock($renderTrack, $t, 860.0, 0.20, 0.3)
            }
        }
    }

    # Acoustic Guitar Arpeggio
    $arp = Get-Arpeggio $chord
    for ($n = 0; $n -lt 8; $n++) {
        $noteTime = $barTime + $n * ($beat * 0.5)
        $pan = if ($n % 2 -eq 0) { -0.32 } else { 0.32 }
        $pluckVol = if ($bar -lt 4) { 0.30 } else { 0.28 }
        [SoundEngine]::RenderPluck($renderTrack, $noteTime, $arp[$n], $beat * 1.6, $pluckVol, $pan, 0.993)
    }

    # Kalimba Sparkle Accent on every 2 bars from Bar 4
    if ($bar -ge 4 -and ($bar % 2 -eq 0)) {
        [SoundEngine]::RenderKalimba($renderTrack, $barTime + 1.5 * $beat, $arp[4], 1.5, 0.24, 0.4)
        [SoundEngine]::RenderKalimba($renderTrack, $barTime + 3.5 * $beat, $arp[6], 1.5, 0.20, -0.4)
    }
}

# Flute & Horn Melodies:
# Theme A (Bars 4..11)
$themeAMelody = @(
    # bar 4: pickup (beat 2, 3)
    @{ t = 3 * $barLen + 2.0 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.38 },
    @{ t = 3 * $barLen + 3.0 * $beat; f = $notes["D5"]; d = $beat * 0.9; v = 0.40 },
    # bar 5 (G)
    @{ t = 4 * $barLen + 0.0 * $beat; f = $notes["G5"]; d = $beat * 2.2; v = 0.46 },
    @{ t = 4 * $barLen + 2.5 * $beat; f = $notes["F#5"]; d = $beat * 0.7; v = 0.40 },
    @{ t = 4 * $barLen + 3.2 * $beat; f = $notes["G5"]; d = $beat * 0.7; v = 0.42 },
    # bar 6 (C)
    @{ t = 5 * $barLen + 0.0 * $beat; f = $notes["E5"]; d = $beat * 2.0; v = 0.44 },
    @{ t = 5 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 0.9; v = 0.42 },
    @{ t = 5 * $barLen + 3.0 * $beat; f = $notes["E5"]; d = $beat * 0.9; v = 0.40 },
    # bar 7 (Em)
    @{ t = 6 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.5; v = 0.42 },
    @{ t = 6 * $barLen + 1.5 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.38 },
    @{ t = 6 * $barLen + 2.5 * $beat; f = $notes["A4"]; d = $beat * 0.7; v = 0.36 },
    @{ t = 6 * $barLen + 3.2 * $beat; f = $notes["G4"]; d = $beat * 0.7; v = 0.35 },
    # bar 8 (D)
    @{ t = 7 * $barLen + 0.0 * $beat; f = $notes["A4"]; d = $beat * 2.5; v = 0.40 },
    @{ t = 7 * $barLen + 2.5 * $beat; f = $notes["B4"]; d = $beat * 0.7; v = 0.38 },
    @{ t = 7 * $barLen + 3.2 * $beat; f = $notes["D5"]; d = $beat * 0.7; v = 0.40 },
    # bar 9 (G)
    @{ t = 8 * $barLen + 0.0 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.38 },
    @{ t = 8 * $barLen + 1.0 * $beat; f = $notes["D5"]; d = $beat * 0.9; v = 0.42 },
    @{ t = 8 * $barLen + 2.0 * $beat; f = $notes["E5"]; d = $beat * 0.9; v = 0.45 },
    @{ t = 8 * $barLen + 3.0 * $beat; f = $notes["G5"]; d = $beat * 0.9; v = 0.48 },
    # bar 10 (C)
    @{ t = 9 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 1.8; v = 0.48 },
    @{ t = 9 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 0.9; v = 0.44 },
    @{ t = 9 * $barLen + 3.0 * $beat; f = $notes["E5"]; d = $beat * 0.9; v = 0.40 },
    # bar 11 (Am -> D)
    @{ t = 10 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.4; v = 0.42 },
    @{ t = 10 * $barLen + 1.5 * $beat; f = $notes["E5"]; d = $beat * 0.8; v = 0.40 },
    @{ t = 10 * $barLen + 2.5 * $beat; f = $notes["D5"]; d = $beat * 0.7; v = 0.38 },
    @{ t = 10 * $barLen + 3.2 * $beat; f = $notes["B4"]; d = $beat * 0.7; v = 0.36 },
    # bar 12 (G resolve)
    @{ t = 11 * $barLen + 0.0 * $beat; f = $notes["G4"]; d = $beat * 3.5; v = 0.44 }
)

foreach ($m in $themeAMelody) {
    [SoundEngine]::RenderFlute($renderTrack, $m.t, $m.f, $m.d, $m.v, 0.08)
}

# Theme B (Bars 12..19) - Deeper into the Woods (Flute & Horn Duet)
$themeBMelody = @(
    # bar 12 (Em): B4 - E5
    @{ t = 12 * $barLen + 0.0 * $beat; f = $notes["B4"]; d = $beat * 1.8; v = 0.40; horn = $false },
    @{ t = 12 * $barLen + 2.0 * $beat; f = $notes["E5"]; d = $beat * 1.8; v = 0.42; horn = $false },
    # bar 13 (C): G5 - E5
    @{ t = 13 * $barLen + 0.0 * $beat; f = $notes["G5"]; d = $beat * 2.2; v = 0.45; horn = $false },
    @{ t = 13 * $barLen + 2.5 * $beat; f = $notes["E5"]; d = $beat * 1.2; v = 0.40; horn = $false },
    # bar 14 (G): D5 - B4
    @{ t = 14 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.8; v = 0.42; horn = $true },
    @{ t = 14 * $barLen + 2.0 * $beat; f = $notes["B4"]; d = $beat * 1.8; v = 0.40; horn = $true },
    # bar 15 (D): A4 - D5
    @{ t = 15 * $barLen + 0.0 * $beat; f = $notes["A4"]; d = $beat * 2.0; v = 0.40; horn = $true },
    @{ t = 15 * $barLen + 2.5 * $beat; f = $notes["D5"]; d = $beat * 1.2; v = 0.42; horn = $true },
    # bar 16 (Em): G5 - A5 - B5 (Climax rising)
    @{ t = 16 * $barLen + 0.0 * $beat; f = $notes["G5"]; d = $beat * 1.0; v = 0.44; horn = $false },
    @{ t = 16 * $barLen + 1.0 * $beat; f = $notes["A5"]; d = $beat * 1.0; v = 0.46; horn = $false },
    @{ t = 16 * $barLen + 2.0 * $beat; f = $notes["B5"]; d = $beat * 1.8; v = 0.48; horn = $false },
    # bar 17 (C): C6 - B5 - G5 - E5
    @{ t = 17 * $barLen + 0.0 * $beat; f = $notes["C6"]; d = $beat * 1.2; v = 0.48; horn = $false },
    @{ t = 17 * $barLen + 1.2 * $beat; f = $notes["B5"]; d = $beat * 0.8; v = 0.44; horn = $false },
    @{ t = 17 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 1.0; v = 0.42; horn = $false },
    @{ t = 17 * $barLen + 3.0 * $beat; f = $notes["E5"]; d = $beat * 0.9; v = 0.40; horn = $false },
    # bar 18 (Am): A5 - G5 - E5 - D5
    @{ t = 18 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 1.4; v = 0.45; horn = $false },
    @{ t = 18 * $barLen + 1.5 * $beat; f = $notes["G5"]; d = $beat * 0.8; v = 0.42; horn = $false },
    @{ t = 18 * $barLen + 2.5 * $beat; f = $notes["E5"]; d = $beat * 0.7; v = 0.40; horn = $false },
    @{ t = 18 * $barLen + 3.2 * $beat; f = $notes["D5"]; d = $beat * 0.7; v = 0.38; horn = $false },
    # bar 19 (D): F#5 - G5 - A5 - D5 (Transition to reprise)
    @{ t = 19 * $barLen + 0.0 * $beat; f = $notes["F#5"]; d = $beat * 1.0; v = 0.42; horn = $true },
    @{ t = 19 * $barLen + 1.0 * $beat; f = $notes["G5"];  d = $beat * 1.0; v = 0.44; horn = $true },
    @{ t = 19 * $barLen + 2.0 * $beat; f = $notes["A5"];  d = $beat * 1.8; v = 0.46; horn = $true }
)

foreach ($m in $themeBMelody) {
    if ($m.horn) {
        [SoundEngine]::RenderHorn($renderTrack, $m.t, $m.f, $m.d, $m.v, -0.15)
    } else {
        [SoundEngine]::RenderFlute($renderTrack, $m.t, $m.f, $m.d, $m.v, 0.15)
    }
}

# Theme A Reprise (Bars 20..25)
$repriseMelody = @(
    # bar 20 (G)
    @{ t = 20 * $barLen + 0.0 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.38 },
    @{ t = 20 * $barLen + 1.0 * $beat; f = $notes["D5"]; d = $beat * 0.9; v = 0.42 },
    @{ t = 20 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 1.8; v = 0.46 },
    # bar 21 (C)
    @{ t = 21 * $barLen + 0.0 * $beat; f = $notes["E5"]; d = $beat * 1.8; v = 0.44 },
    @{ t = 21 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 0.9; v = 0.42 },
    @{ t = 21 * $barLen + 3.0 * $beat; f = $notes["E5"]; d = $beat * 0.9; v = 0.40 },
    # bar 22 (Em)
    @{ t = 22 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.5; v = 0.42 },
    @{ t = 22 * $barLen + 1.5 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.38 },
    @{ t = 22 * $barLen + 2.5 * $beat; f = $notes["A4"]; d = $beat * 0.7; v = 0.36 },
    @{ t = 22 * $barLen + 3.2 * $beat; f = $notes["G4"]; d = $beat * 0.7; v = 0.35 },
    # bar 23 (C)
    @{ t = 23 * $barLen + 0.0 * $beat; f = $notes["E4"]; d = $beat * 1.0; v = 0.36 },
    @{ t = 23 * $barLen + 1.0 * $beat; f = $notes["G4"]; d = $beat * 1.0; v = 0.38 },
    @{ t = 23 * $barLen + 2.0 * $beat; f = $notes["B4"]; d = $beat * 0.9; v = 0.40 },
    @{ t = 23 * $barLen + 3.0 * $beat; f = $notes["D5"]; d = $beat * 0.9; v = 0.42 },
    # bar 24 (Am -> D)
    @{ t = 24 * $barLen + 0.0 * $beat; f = $notes["C5"]; d = $beat * 1.5; v = 0.42 },
    @{ t = 24 * $barLen + 1.5 * $beat; f = $notes["B4"]; d = $beat * 0.8; v = 0.40 },
    @{ t = 24 * $barLen + 2.5 * $beat; f = $notes["A4"]; d = $beat * 1.4; v = 0.38 },
    # bar 25 (G resolve - leads smoothly into Bar 0)
    @{ t = 25 * $barLen + 0.0 * $beat; f = $notes["G4"]; d = $beat * 3.6; v = 0.42 }
)

foreach ($m in $repriseMelody) {
    [SoundEngine]::RenderFlute($renderTrack, $m.t, $m.f, $m.d, $m.v, 0.05)
}

# Post process with stereo reverb
[SoundEngine]::PostProcess($renderTrack, 0.22, 0.89)

# Seamless Loop Wrapping: Wrap the tail samples (after 60.00s) back to the beginning (0.0s)
$finalBgmTrack = New-Object SoundEngine+Track($trackLenSamples)
for ($i = 0; $i -lt $trackLenSamples; $i++) {
    $finalBgmTrack.Left[$i] = $renderTrack.Left[$i]
    $finalBgmTrack.Right[$i] = $renderTrack.Right[$i]
}

# Add wrapped reverberation
for ($i = 0; $i -lt $extraTailSamples; $i++) {
    if ($i -lt $trackLenSamples) {
        $finalBgmTrack.Left[$i] += $renderTrack.Left[$trackLenSamples + $i]
        $finalBgmTrack.Right[$i] += $renderTrack.Right[$trackLenSamples + $i]
    }
}

# Apply micro-fade (5ms) at loop boundary to guarantee zero click
$microFadeSamples = [int](0.005 * $SR)
for ($i = 0; $i -lt $microFadeSamples; $i++) {
    $factorIn = $i / [float]$microFadeSamples
    $finalBgmTrack.Left[$i] *= $factorIn
    $finalBgmTrack.Right[$i] *= $factorIn

    $endIdx = $trackLenSamples - 1 - $i
    $finalBgmTrack.Left[$endIdx] *= $factorIn
    $finalBgmTrack.Right[$endIdx] *= $factorIn
}

# Save BGM-01
[SoundEngine]::WriteWav($finalBgmTrack, "assets/audio/masters/bgm_title_forest_departure_loop_master.wav")
[SoundEngine]::WriteWav($finalBgmTrack, "assets/audio/bgm/bgm_title_forest_departure_loop.wav")
Write-Host "BGM-01 successfully rendered! (60.00s, seamless loop)"


# =========================================================================
# 2. ST-01: st_title_start (2.20s, G Major Departure Stinger)
# =========================================================================
Write-Host "Rendering ST-01: st_title_start..."
$stDuration = 2.20
$stSamples = [int]($stDuration * $SR)
$stTrack = New-Object SoundEngine+Track($stSamples)

# 1. Warm Wooden Departure Click (Woodblock + Mallet)
[SoundEngine]::RenderWoodblock($stTrack, 0.00, 920.0, 0.35, 0.0)
[SoundEngine]::RenderMalletKick($stTrack, 0.00, 0.45)

# 2. Rapid acoustic guitar strum rollup: G3, B3, D4, G4, B4, D5 (from 0.02s)
$strumNotes = @($notes["G3"], $notes["B3"], $notes["D4"], $notes["G4"], $notes["B4"], $notes["D5"])
for ($s = 0; $s -lt $strumNotes.Count; $s++) {
    $stTime = 0.02 + $s * 0.025
    [SoundEngine]::RenderPluck($stTrack, $stTime, $strumNotes[$s], 1.8, 0.38, 0.1, 0.992)
}

# 3. Flute Rising Departure Motif: D5 -> G5 -> B5 (from 0.15s)
[SoundEngine]::RenderFlute($stTrack, 0.15, $notes["D5"], 0.35, 0.42, 0.05)
[SoundEngine]::RenderFlute($stTrack, 0.32, $notes["G5"], 0.45, 0.45, 0.05)
[SoundEngine]::RenderFlute($stTrack, 0.55, $notes["B5"], 1.30, 0.48, 0.05)

# 4. Glockenspiel / Kalimba Starlight Chime Sparkle: D6 -> G6 (High chime of departure)
[SoundEngine]::RenderKalimba($stTrack, 0.55, $notes["D6"], 1.5, 0.36, -0.2)
[SoundEngine]::RenderKalimba($stTrack, 0.70, $notes["G6"], 1.4, 0.40, 0.2)

# 5. Warm Bass Anchor (G2)
[SoundEngine]::RenderBass($stTrack, 0.05, $notes["G2"], 1.9, 0.46)

# Post process & save ST-01
[SoundEngine]::PostProcess($stTrack, 0.25, 0.89)
[SoundEngine]::WriteWav($stTrack, "assets/audio/masters/st_title_start_master.wav")
[SoundEngine]::WriteWav($stTrack, "assets/audio/stingers/st_title_start.wav")
Write-Host "ST-01 successfully rendered! (2.20s)"
