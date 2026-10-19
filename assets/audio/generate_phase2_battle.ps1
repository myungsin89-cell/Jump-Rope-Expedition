$csCode = Get-Content -Raw -Path "assets/audio/BattleAudioEngine.cs"
Add-Type -TypeDefinition $csCode

function Save-Dual($track, $relPath, $targetPeak = 0.89, $reverb = 0.16) {
    $fullWeb = "assets/audio/$relPath"
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($relPath)
    $fullMaster = "assets/audio/masters/${fileName}_master.wav"
    [BattleAudioEngineV2]::MasterAndSave($track, $fullWeb, $targetPeak, $reverb)
    [BattleAudioEngineV2]::MasterAndSave($track, $fullMaster, $targetPeak, $reverb)
}

$SR = [BattleAudioEngineV2]::SAMPLE_RATE

# Note Frequencies
$notes = @{
    "D2" = 73.42; "E2" = 82.41; "F2" = 87.31; "G2" = 98.00; "A2" = 110.00; "Bb2" = 116.54; "B2" = 123.47; "C3" = 130.81;
    "D3" = 146.83; "E3" = 164.81; "F3" = 174.61; "G3" = 196.00; "A3" = 220.00; "Bb3" = 233.08; "B3" = 246.94; "C4" = 261.63;
    "D4" = 293.66; "E4" = 329.63; "F4" = 349.23; "G4" = 392.00; "A4" = 440.00; "Bb4" = 466.16; "B4" = 493.88; "C5" = 523.25;
    "D5" = 587.33; "E5" = 659.25; "F5" = 698.46; "G5" = 783.99; "A5" = 880.00; "Bb5" = 932.33; "C6" = 1046.50; "D6" = 1174.66;
}

Write-Host "=================================================="
Write-Host " Phase 2: Final Battle Audio Production "
Write-Host "=================================================="

# =========================================================================
# 1. BGM-02: bgm_final_battle_main_loop (BPM 132, D Minor/Dorian, 28 bars = 50.91s)
# =========================================================================
Write-Host "Rendering BGM-02: bgm_final_battle_main_loop (50.91s Seamless Loop)..."
$bpm = 132.0
$beat = 60.0 / $bpm
$barLen = 4.0 * $beat # 1.818s
$totalBars = 28
$totalSeconds = $totalBars * $barLen # 50.91s
$trackLenSamples = [int]($totalSeconds * $SR)
$extraTailSamples = [int](3.0 * $SR)

$renderTrack = New-Object BattleAudioEngineV2+Track($trackLenSamples + $extraTailSamples)

# 28 Bars Harmony Progression (Heroic Forest Battle):
# Bars 0-3 (Battle Drive Intro): Dm, Dm, Dm, Dm
# Bars 4-11 (Section 1 - Charge of the Units): Dm, F, C, Dm, Bb, F, Gm, A
# Bars 12-19 (Section 2 - Boss Clashing & Team Defense): Dm, Bb, C, Dm, Gm, Dm, Bb, A
# Bars 20-27 (Section 3 - Heroic Counter-Offensive & Turnaround): Dm, F, G, Bb, Dm, F, Gm-A, Dm
$battleChords = @(
    "Dm", "Dm", "Dm", "Dm",
    "Dm", "F", "C", "Dm", "Bb", "F", "Gm", "A",
    "Dm", "Bb", "C", "Dm", "Gm", "Dm", "Bb", "A",
    "Dm", "F", "G", "Bb", "Dm", "F", "Gm", "Dm"
)

$bassProg = @(
    $notes["D2"], $notes["D2"], $notes["D2"], $notes["D2"],
    $notes["D2"], $notes["F2"], $notes["C2"], $notes["D2"], $notes["Bb2"], $notes["F2"], $notes["G2"], $notes["A2"],
    $notes["D2"], $notes["Bb2"], $notes["C2"], $notes["D2"], $notes["G2"], $notes["D2"], $notes["Bb2"], $notes["A2"],
    $notes["D2"], $notes["F2"], $notes["G2"], $notes["Bb2"], $notes["D2"], $notes["F2"], $notes["G2"], $notes["D2"]
)

for ($bar = 0; $bar -lt $totalBars; $bar++) {
    $barTime = $bar * $barLen
    $chord = $battleChords[$bar]
    $root = $bassProg[$bar]

    # Driving War Drums on beats 1, 2.5, 3
    [BattleAudioEngineV2]::AddWarDrum($renderTrack, $barTime, 0.48, -0.2)
    [BattleAudioEngineV2]::AddWarDrum($renderTrack, $barTime + 1.5 * $beat, 0.38, 0.2)
    [BattleAudioEngineV2]::AddWarDrum($renderTrack, $barTime + 2.0 * $beat, 0.44, 0.0)

    # Woodblock & Shaker battle rhythm
    for ($b = 0; $b -lt 4; $b++) {
        $t = $barTime + $b * $beat
        [BattleAudioEngineV2]::AddModalTone($renderTrack, $t + $beat * 0.5, 980.0, 0.05, 75.0, 0.22, 0.3)
        [BattleAudioEngineV2]::AddNoiseBurst($renderTrack, $t, 0.04, 3000.0, 4500.0, 0.25, -0.3, $true)
    }

    # Staccato Driving Bassline (8th notes)
    for ($n = 0; $n -lt 8; $n++) {
        $nt = $barTime + $n * ($beat * 0.5)
        $nFreq = if ($n % 2 -eq 0) { $root } else { $root * 1.5 } # Root and 5th
        [BattleAudioEngineV2]::AddPluck($renderTrack, $nt, $nFreq, $beat * 0.45, 0.35, -0.1, 0.985)
    }

    # Kalimba rhythmic ostinato in D Minor (D5-F5-A5-D6)
    if ($bar -ge 4) {
        $kNotes = @($notes["D5"], $notes["F5"], $notes["A5"], $notes["D6"])
        for ($k = 0; $k -lt 4; $k++) {
            [BattleAudioEngineV2]::AddModalTone($renderTrack, $barTime + $k * $beat, $kNotes[$k % 4], 0.30, 8.0, 0.25, 0.3)
        }
    }
}

# Battle Melody 1: Heroic Brass Horn Theme (Bars 4..11)
$hornMelody = @(
    # bar 4: D4 -> F4 -> A4
    @{ t = 4 * $barLen + 0.0 * $beat; f = $notes["D4"]; d = $beat * 1.2; v = 0.45 },
    @{ t = 4 * $barLen + 1.5 * $beat; f = $notes["F4"]; d = $beat * 1.0; v = 0.48 },
    @{ t = 4 * $barLen + 3.0 * $beat; f = $notes["A4"]; d = $beat * 1.0; v = 0.50 },
    # bar 5: C5 -> A4
    @{ t = 5 * $barLen + 0.0 * $beat; f = $notes["C5"]; d = $beat * 2.0; v = 0.52 },
    @{ t = 5 * $barLen + 2.5 * $beat; f = $notes["A4"]; d = $beat * 1.2; v = 0.48 },
    # bar 6: G4 -> A4 -> C5
    @{ t = 6 * $barLen + 0.0 * $beat; f = $notes["G4"]; d = $beat * 1.5; v = 0.46 },
    @{ t = 6 * $barLen + 2.0 * $beat; f = $notes["A4"]; d = $beat * 1.0; v = 0.48 },
    @{ t = 6 * $barLen + 3.0 * $beat; f = $notes["C5"]; d = $beat * 1.0; v = 0.50 },
    # bar 7: D5 (Triumphant hold)
    @{ t = 7 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 3.5; v = 0.55 },
    # bar 8: D5 -> F5 -> E5
    @{ t = 8 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.5; v = 0.50 },
    @{ t = 8 * $barLen + 2.0 * $beat; f = $notes["F5"]; d = $beat * 1.0; v = 0.52 },
    @{ t = 8 * $barLen + 3.0 * $beat; f = $notes["E5"]; d = $beat * 1.0; v = 0.48 },
    # bar 9: D5 -> C5
    @{ t = 9 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 2.0; v = 0.50 },
    @{ t = 9 * $barLen + 2.5 * $beat; f = $notes["C5"]; d = $beat * 1.2; v = 0.46 },
    # bar 10: Bb4 -> C5 -> D5
    @{ t = 10 * $barLen + 0.0 * $beat; f = $notes["Bb4"]; d = $beat * 1.5; v = 0.46 },
    @{ t = 10 * $barLen + 2.0 * $beat; f = $notes["C5"]; d = $beat * 1.0; v = 0.48 },
    @{ t = 10 * $barLen + 3.0 * $beat; f = $notes["D5"]; d = $beat * 1.0; v = 0.50 },
    # bar 11: A4 (Cadence)
    @{ t = 11 * $barLen + 0.0 * $beat; f = $notes["A4"]; d = $beat * 3.5; v = 0.52 }
)

foreach ($h in $hornMelody) {
    [BattleAudioEngineV2]::AddHornNote($renderTrack, $h.t, $h.f, $h.d, $h.v, -0.2)
}

# Battle Melody 2: Gallant Woodwind Counter-Melody (Bars 12..19)
$fluteBattle = @(
    @{ t = 12 * $barLen + 0.0 * $beat; f = $notes["F5"]; d = $beat * 1.8; v = 0.48 },
    @{ t = 12 * $barLen + 2.0 * $beat; f = $notes["E5"]; d = $beat * 1.8; v = 0.46 },
    @{ t = 13 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 2.5; v = 0.50 },
    @{ t = 14 * $barLen + 0.0 * $beat; f = $notes["E5"]; d = $beat * 1.8; v = 0.48 },
    @{ t = 14 * $barLen + 2.0 * $beat; f = $notes["F5"]; d = $beat * 1.8; v = 0.50 },
    @{ t = 15 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 3.2; v = 0.55 },
    @{ t = 16 * $barLen + 0.0 * $beat; f = $notes["G5"]; d = $beat * 1.5; v = 0.48 },
    @{ t = 16 * $barLen + 2.0 * $beat; f = $notes["F5"]; d = $beat * 1.5; v = 0.46 },
    @{ t = 17 * $barLen + 0.0 * $beat; f = $notes["E5"]; d = $beat * 3.0; v = 0.48 },
    @{ t = 18 * $barLen + 0.0 * $beat; f = $notes["F5"]; d = $beat * 1.8; v = 0.50 },
    @{ t = 18 * $barLen + 2.0 * $beat; f = $notes["G5"]; d = $beat * 1.8; v = 0.52 },
    @{ t = 19 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 3.5; v = 0.55 }
)

foreach ($f in $fluteBattle) {
    [BattleAudioEngineV2]::AddFluteNote($renderTrack, $f.t, $f.f, $f.d, $f.v, 0.2)
}

# Grand Climax: Horn & Flute Unison (Bars 20..27)
$climaxMelody = @(
    @{ t = 20 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 1.5; v = 0.52 },
    @{ t = 20 * $barLen + 2.0 * $beat; f = $notes["F5"]; d = $beat * 1.5; v = 0.55 },
    @{ t = 21 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 2.8; v = 0.58 },
    @{ t = 22 * $barLen + 0.0 * $beat; f = $notes["G5"]; d = $beat * 1.5; v = 0.52 },
    @{ t = 22 * $barLen + 2.0 * $beat; f = $notes["Bb5"]; d = $beat * 1.5; v = 0.55 },
    @{ t = 23 * $barLen + 0.0 * $beat; f = $notes["A5"]; d = $beat * 2.8; v = 0.58 },
    @{ t = 24 * $barLen + 0.0 * $beat; f = $notes["F5"]; d = $beat * 1.5; v = 0.52 },
    @{ t = 24 * $barLen + 2.0 * $beat; f = $notes["E5"]; d = $beat * 1.5; v = 0.50 },
    @{ t = 25 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 2.8; v = 0.52 },
    @{ t = 26 * $barLen + 0.0 * $beat; f = $notes["E5"]; d = $beat * 1.5; v = 0.50 },
    @{ t = 26 * $barLen + 2.0 * $beat; f = $notes["C#5"]; d = $beat * 1.5; v = 0.50 },
    @{ t = 27 * $barLen + 0.0 * $beat; f = $notes["D5"]; d = $beat * 3.6; v = 0.56 }
)

foreach ($c in $climaxMelody) {
    [BattleAudioEngineV2]::AddHornNote($renderTrack, $c.t, $c.f * 0.5, $c.d, $c.v, -0.15)
    [BattleAudioEngineV2]::AddFluteNote($renderTrack, $c.t, $c.f, $c.d, $c.v * 0.9, 0.15)
}

# Post Process with Reverb
[BattleAudioEngineV2]::PostProcess($renderTrack, 0.20, 0.89)

# Seamless Loop Wrap
$finalBattleTrack = New-Object BattleAudioEngineV2+Track($trackLenSamples)
for ($i = 0; $i -lt $trackLenSamples; $i++) {
    $finalBattleTrack.Left[$i] = $renderTrack.Left[$i]
    $finalBattleTrack.Right[$i] = $renderTrack.Right[$i]
}
for ($i = 0; $i -lt $extraTailSamples; $i++) {
    if ($i -lt $trackLenSamples) {
        $finalBattleTrack.Left[$i] += $renderTrack.Left[$trackLenSamples + $i]
        $finalBattleTrack.Right[$i] += $renderTrack.Right[$trackLenSamples + $i]
    }
}
$microFade = [int](0.005 * $SR)
for ($i = 0; $i -lt $microFade; $i++) {
    $fact = $i / [float]$microFade
    $finalBattleTrack.Left[$i] *= $fact; $finalBattleTrack.Right[$i] *= $fact
    $endIdx = $trackLenSamples - 1 - $i
    $finalBattleTrack.Left[$endIdx] *= $fact; $finalBattleTrack.Right[$endIdx] *= $fact
}

[BattleAudioEngineV2]::WriteWav($finalBattleTrack, "assets/audio/masters/bgm_final_battle_main_loop_master.wav")
[BattleAudioEngineV2]::WriteWav($finalBattleTrack, "assets/audio/bgm/bgm_final_battle_main_loop.wav")
Write-Host "BGM-02 rendered successfully! (50.91s)"


# =========================================================================
# 2. 전환 및 결과 스팅어 (4종)
# =========================================================================

# ST-02: st_boss_reveal (3.80s) - Secret Boss Awakening
Write-Host "Rendering ST-02: st_boss_reveal..."
$t = New-Object BattleAudioEngineV2+Track(3.80)
# Deep rumbling ground awakening
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 65.0, 1.8, 4.0, 0.65, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 1.4, 600.0, 2200.0, 0.55, 0.0, $true)
# Ancient boss brass awakening fanfare: D3 -> F3 -> A3 -> D4
[BattleAudioEngineV2]::AddHornNote($t, 0.80, $notes["D3"], 0.6, 0.55, -0.2)
[BattleAudioEngineV2]::AddHornNote($t, 1.40, $notes["F3"], 0.6, 0.58, -0.1)
[BattleAudioEngineV2]::AddHornNote($t, 2.00, $notes["A3"], 0.7, 0.62, 0.1)
[BattleAudioEngineV2]::AddHornNote($t, 2.60, $notes["D4"], 1.2, 0.68, 0.0)
[BattleAudioEngineV2]::AddFluteNote($t, 2.60, $notes["D5"], 1.2, 0.45, 0.1)
Save-Dual $t "stingers/st_boss_reveal.wav" 0.90 0.22

# ST-03: st_class_finish (5.50s) - Cooperative All-Three-Teams Finish
Write-Host "Rendering ST-03: st_class_finish..."
$t = New-Object BattleAudioEngineV2+Track(5.50)
# Team 1, 2, 3 power gathering surges (Green, Gold, Blue)
$teamsChord = @([double]261.63, [double]329.63, [double]392.00, [double]523.25)
[BattleAudioEngineV2]::AddPadChord($t, 0.00, $teamsChord, 2.5, 0.55)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 2.2, 800.0, 4000.0, 0.50, 0.0, $true)
# Rising class power buildup
for ($i = 0; $i -lt 8; $i++) {
    $panDrum = if ($i % 2 -eq 0) { -0.2 } else { 0.2 }
    [BattleAudioEngineV2]::AddWarDrum($t, 0.3 * $i, 0.3 + $i * 0.05, $panDrum)
}
# Massive United Impact on 2.4s
[BattleAudioEngineV2]::AddModalTone($t, 2.40, 60.0, 1.5, 5.0, 0.75, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 2.40, 1.2, 1200.0, 5000.0, 0.65, 0.0, $false)
# Radiant Victory Chord Ringout (G Major resolution)
$finishChord = @([double]196.0, [double]293.7, [double]392.0, [double]493.9, [double]587.3)
[BattleAudioEngineV2]::AddPadChord($t, 2.40, $finishChord, 3.0, 0.65)
[BattleAudioEngineV2]::AddHornNote($t, 2.40, $notes["G4"], 2.8, 0.65, -0.15)
[BattleAudioEngineV2]::AddFluteNote($t, 2.40, $notes["B5"], 2.8, 0.55, 0.15)
Save-Dual $t "stingers/st_class_finish.wav" 0.90 0.24

# ST-04: st_boss_defeat (3.80s) - Boss Purification & Peaceful Rest
Write-Host "Rendering ST-04: st_boss_defeat..."
$t = New-Object BattleAudioEngineV2+Track(3.80)
# Dissipating energy whoosh
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 1.5, 2500.0, 800.0, 0.50, 0.0, $false)
# Gentle forest bells & chimes (Purified peace)
$purifyBells = @(1046.50, 1318.51, 1567.98, 2093.00)
for ($b = 0; $b -lt 4; $b++) {
    [BattleAudioEngineV2]::AddModalTone($t, 0.4 + $b * 0.25, $purifyBells[$b], 1.8, 3.0, 0.50, ($b - 1.5) * 0.2)
}
# Warm flute lullaby of the forest
[BattleAudioEngineV2]::AddFluteNote($t, 1.20, $notes["G5"], 2.2, 0.52, 0.0)
[BattleAudioEngineV2]::AddFluteNote($t, 1.80, $notes["E5"], 1.8, 0.48, 0.0)
[BattleAudioEngineV2]::AddFluteNote($t, 2.40, $notes["C5"], 1.4, 0.45, 0.0)
Save-Dual $t "stingers/st_boss_defeat.wav" 0.88 0.22

# ST-05: st_result_reveal (6.20s) - Joint Celebration & Trophy Ceremony Fanfare
Write-Host "Rendering ST-05: st_result_reveal..."
$t = New-Object BattleAudioEngineV2+Track(6.20)
# Drum roll buildup (0.0s ~ 1.0s)
for ($i = 0; $i -lt 16; $i++) {
    $panRoll = if ($i % 2 -eq 0) { -0.2 } else { 0.2 }
    [BattleAudioEngineV2]::AddModalTone($t, $i * 0.06, 120.0, 0.1, 20.0, 0.2 + $i * 0.03, $panRoll)
}
# Grand Fanfare Entrance on 1.0s
[BattleAudioEngineV2]::AddWarDrum($t, 1.00, 0.65, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 1.00, 0.6, 2000.0, 5000.0, 0.50, 0.0, $true)
# Triumphant Joint March Fanfare (C -> E -> G -> C6)
[BattleAudioEngineV2]::AddHornNote($t, 1.00, $notes["C4"], 0.4, 0.55, -0.2)
[BattleAudioEngineV2]::AddHornNote($t, 1.35, $notes["E4"], 0.4, 0.58, -0.1)
[BattleAudioEngineV2]::AddHornNote($t, 1.70, $notes["G4"], 0.5, 0.62, 0.1)
[BattleAudioEngineV2]::AddHornNote($t, 2.10, $notes["C5"], 1.8, 0.68, 0.0)
[BattleAudioEngineV2]::AddFluteNote($t, 2.10, $notes["C6"], 1.8, 0.55, 0.0)
# Follow-up celebratory theme
[BattleAudioEngineV2]::AddHornNote($t, 3.60, $notes["G4"], 0.5, 0.55, -0.1)
[BattleAudioEngineV2]::AddHornNote($t, 4.10, $notes["A4"], 0.5, 0.58, -0.1)
[BattleAudioEngineV2]::AddHornNote($t, 4.60, $notes["C5"], 1.5, 0.65, 0.0)
[BattleAudioEngineV2]::AddFluteNote($t, 4.60, $notes["C6"], 1.5, 0.52, 0.0)
# Crystalline victory chimes
$trophyChimes = @(2093.00, 1760.00, 1567.98, 1318.51, 1046.50)
for ($k = 0; $k -lt $trophyChimes.Count; $k++) {
    [BattleAudioEngineV2]::AddModalTone($t, 2.2 + $k * 0.15, $trophyChimes[$k], 1.5, 3.5, 0.45, ($k - 2) * 0.2)
}
Save-Dual $t "stingers/st_result_reveal.wav" 0.90 0.24


# =========================================================================
# 3. 전투 핵심 효과음 (15종)
# =========================================================================
Write-Host "Rendering 15 Battle SFX..."

# BT-01: sfx_unit_enter (0.75s) - Units marching into field
$t = New-Object BattleAudioEngineV2+Track(0.75)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 160.0, 0.12, 30.0, 0.60, -0.2)
[BattleAudioEngineV2]::AddModalTone($t, 0.15, 180.0, 0.12, 30.0, 0.62, 0.2)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.25, 1200.0, 2400.0, 0.45, 0.0, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.28, 650.0, 0.15, 40.0, 0.55, 0.0) # snap
Save-Dual $t "sfx/battle/sfx_unit_enter.wav" 0.88 0.12

# BT-02: sfx_acorn_ranged_attack (0.65s) - Acorn slingshot whoosh + pop
$t = New-Object BattleAudioEngineV2+Track(0.65)
# Slingshot elasticity tension & release (whistle whoosh)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.20, 800.0, 3200.0, 0.60, -0.2, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.12, 580.0, 0.08, 60.0, 0.65, 0.1) # elastic snap
[BattleAudioEngineV2]::AddModalTone($t, 0.14, 1200.0, 0.12, 45.0, 0.50, 0.2) # flying pop
Save-Dual $t "sfx/battle/sfx_acorn_ranged_attack.wav" 0.88 0.10

# BT-03: sfx_hammer_melee_attack (0.65s) - Solid wooden hammer swing + heavy thump
$t = New-Object BattleAudioEngineV2+Track(0.65)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.25, 400.0, 1600.0, 0.65, -0.3, $true) # heavy whoosh
[BattleAudioEngineV2]::AddModalTone($t, 0.18, 120.0, 0.22, 22.0, 0.75, 0.0) # heavy thump
[BattleAudioEngineV2]::AddModalTone($t, 0.18, 640.0, 0.10, 50.0, 0.65, 0.1) # wood impact
Save-Dual $t "sfx/battle/sfx_hammer_melee_attack.wav" 0.90 0.12

# BT-04: sfx_leaf_guard_raise (0.75s) - Giant leaf shield unfurling
$t = New-Object BattleAudioEngineV2+Track(0.75)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.40, 1400.0, 3200.0, 0.65, 0.0, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.15, 320.0, 0.25, 25.0, 0.55, 0.0) # shield body
[BattleAudioEngineV2]::AddModalTone($t, 0.25, 840.0, 0.15, 35.0, 0.50, 0.1) # leaf lock
Save-Dual $t "sfx/battle/sfx_leaf_guard_raise.wav" 0.88 0.15

# BT-05: sfx_leaf_guard_hit (0.55s) - Physical block against leaf/wood
$t = New-Object BattleAudioEngineV2+Track(0.55)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 180.0, 0.15, 30.0, 0.70, 0.0)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 520.0, 0.10, 50.0, 0.65, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.15, 1000.0, 2200.0, 0.50, 0.0, $false)
Save-Dual $t "sfx/battle/sfx_leaf_guard_hit.wav" 0.88 0.10

# BT-06: sfx_star_barrier_cast (0.95s) - Starlight barrier shimmering shield
$t = New-Object BattleAudioEngineV2+Track(0.95)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.65, 1800.0, 4800.0, 0.60, 0.0, $true)
$shieldChimes = @(1046.50, 1318.51, 1567.98, 2093.00)
for ($s = 0; $s -lt 4; $s++) {
    [BattleAudioEngineV2]::AddModalTone($t, 0.1 + $s * 0.12, $shieldChimes[$s], 0.6, 6.0, 0.50, ($s - 1.5) * 0.2)
}
Save-Dual $t "sfx/battle/sfx_star_barrier_cast.wav" 0.88 0.20

# BT-07: sfx_star_barrier_hit (0.60s) - Magic deflected off crystal barrier (Ting!)
$t = New-Object BattleAudioEngineV2+Track(0.60)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 1760.0, 0.45, 12.0, 0.70, -0.1) # high crystal ding
[BattleAudioEngineV2]::AddModalTone($t, 0.02, 2637.0, 0.35, 15.0, 0.60, 0.1)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.18, 3000.0, 6000.0, 0.45, 0.0, $false)
Save-Dual $t "sfx/battle/sfx_star_barrier_hit.wav" 0.88 0.18

# BT-08: sfx_boss_physical_telegraph (1.10s) - Ground vibration windup
$t = New-Object BattleAudioEngineV2+Track(1.10)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 55.0, 0.9, 5.0, 0.75, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.85, 400.0, 1200.0, 0.60, 0.0, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.45, 110.0, 0.4, 15.0, 0.55, 0.0)
Save-Dual $t "sfx/battle/sfx_boss_physical_telegraph.wav" 0.88 0.14

# BT-09: sfx_boss_magic_telegraph (1.10s) - Magic gathering energy swirl
$t = New-Object BattleAudioEngineV2+Track(1.10)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.95, 800.0, 3600.0, 0.65, 0.0, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.30, 440.0, 0.6, 6.0, 0.45, -0.2)
[BattleAudioEngineV2]::AddModalTone($t, 0.55, 660.0, 0.5, 6.0, 0.50, 0.2)
Save-Dual $t "sfx/battle/sfx_boss_magic_telegraph.wav" 0.88 0.20

# BT-10: sfx_boss_physical_attack (1.20s) - Giant physical shockwave swipe
$t = New-Object BattleAudioEngineV2+Track(1.20)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 60.0, 0.8, 6.0, 0.80, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.7, 600.0, 2000.0, 0.70, 0.0, $false)
[BattleAudioEngineV2]::AddModalTone($t, 0.10, 220.0, 0.3, 20.0, 0.65, 0.1)
Save-Dual $t "sfx/battle/sfx_boss_physical_attack.wav" 0.90 0.16

# BT-11: sfx_boss_magic_attack (1.20s) - Nature elemental magic discharge
$t = New-Object BattleAudioEngineV2+Track(1.20)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.85, 1200.0, 4200.0, 0.70, 0.0, $false)
[BattleAudioEngineV2]::AddModalTone($t, 0.05, 520.0, 0.7, 7.0, 0.60, -0.2)
[BattleAudioEngineV2]::AddModalTone($t, 0.15, 780.0, 0.6, 7.0, 0.55, 0.2)
Save-Dual $t "sfx/battle/sfx_boss_magic_attack.wav" 0.90 0.20

# BT-12: sfx_boss_hit (0.45s) - Solid strike on boss surface
$t = New-Object BattleAudioEngineV2+Track(0.45)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 160.0, 0.15, 30.0, 0.75, 0.0)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 750.0, 0.10, 50.0, 0.65, 0.1)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.10, 1400.0, 3200.0, 0.55, 0.0, $false)
Save-Dual $t "sfx/battle/sfx_boss_hit.wav" 0.90 0.10

# BT-13: sfx_boss_stagger (1.10s) - Boss staggering / giant wood creak
$t = New-Object BattleAudioEngineV2+Track(1.10)
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 85.0, 0.5, 12.0, 0.70, -0.1)
[BattleAudioEngineV2]::AddModalTone($t, 0.20, 95.0, 0.5, 12.0, 0.65, 0.1)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.65, 500.0, 1500.0, 0.55, 0.0, $true)
Save-Dual $t "sfx/battle/sfx_boss_stagger.wav" 0.88 0.14

# BT-14: sfx_hero_cutin (1.00s) - Time freeze heartbeat & dramatic flash
$t = New-Object BattleAudioEngineV2+Track(1.00)
# Heartbeat thump
[BattleAudioEngineV2]::AddModalTone($t, 0.00, 60.0, 0.35, 15.0, 0.85, 0.0)
# Flash shimmer
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.65, 2000.0, 6000.0, 0.60, 0.0, $true)
[BattleAudioEngineV2]::AddModalTone($t, 0.08, 1567.98, 0.70, 6.0, 0.55, 0.2)
Save-Dual $t "sfx/battle/sfx_hero_cutin.wav" 0.90 0.20

# BT-15: sfx_hero_ultimate (2.00s) - Hero Ultimate leap & majestic elemental impact
$t = New-Object BattleAudioEngineV2+Track(2.00)
# Rising soaring whoosh
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.00, 0.6, 800.0, 3800.0, 0.65, 0.0, $true)
# Giant Impact on 0.55s
[BattleAudioEngineV2]::AddModalTone($t, 0.55, 55.0, 0.9, 6.0, 0.85, 0.0)
[BattleAudioEngineV2]::AddNoiseBurst($t, 0.55, 0.8, 1400.0, 5500.0, 0.70, 0.0, $false)
# Radiant burst chimes
$ultBells = @(1046.50, 1318.51, 1567.98, 2093.00)
for ($u = 0; $u -lt 4; $u++) {
    [BattleAudioEngineV2]::AddModalTone($t, 0.65 + $u * 0.1, $ultBells[$u], 1.2, 4.0, 0.55, ($u - 1.5) * 0.2)
}
Save-Dual $t "sfx/battle/sfx_hero_ultimate.wav" 0.90 0.22

Write-Host "=================================================="
Write-Host " All Phase 2 Battle Audio Successfully Rendered! "
Write-Host "=================================================="
