$csCode = Get-Content -Raw -Path "assets/audio/SfxEngine.cs"
Add-Type -TypeDefinition $csCode

function Save-Dual($track, $relPath, $targetPeak = 0.89, $reverb = 0.15) {
    $fullWeb = "assets/audio/$relPath"
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($relPath)
    $fullMaster = "assets/audio/masters/${fileName}_master.wav"
    [SfxEngineV2]::MasterAndSave($track, $fullWeb, $targetPeak, $reverb)
    [SfxEngineV2]::MasterAndSave($track, $fullMaster, $targetPeak, $reverb)
}

Write-Host "--- Regenerating Improved Phase 1 SFX (User Feedback Addressed) ---"

# =========================================================================
# 1. 공통 UI
# =========================================================================

# UI-01: sfx_ui_tap (0.14s)
$t = New-Object SfxEngineV2+Track(0.14)
[SfxEngineV2]::AddModalTone($t, 0.00, 860.0, 0.08, 65.0, 0.70, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.00, 1950.0, 0.05, 90.0, 0.40, 0.1)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.04, 2500.0, 3500.0, 0.45, 0.0, $true)
Save-Dual $t "sfx/ui/sfx_ui_tap.wav" 0.86 0.06

# UI-02: sfx_ui_confirm (0.55s)
$t = New-Object SfxEngineV2+Track(0.55)
[SfxEngineV2]::AddModalTone($t, 0.00, 784.0, 0.35, 12.0, 0.55, -0.2)
[SfxEngineV2]::AddModalTone($t, 0.08, 1046.5, 0.40, 10.0, 0.60, 0.2)
[SfxEngineV2]::AddModalTone($t, 0.00, 520.0, 0.08, 50.0, 0.40, 0.0)
Save-Dual $t "sfx/ui/sfx_ui_confirm.wav" 0.88 0.14

# UI-03: sfx_ui_cancel (0.38s)
$t = New-Object SfxEngineV2+Track(0.38)
[SfxEngineV2]::AddModalTone($t, 0.00, 329.6, 0.22, 22.0, 0.50, -0.1)
[SfxEngineV2]::AddModalTone($t, 0.07, 261.6, 0.25, 18.0, 0.45, 0.1)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.08, 800.0, 500.0, 0.35, 0.0, $false)
Save-Dual $t "sfx/ui/sfx_ui_cancel.wav" 0.84 0.08

# UI-04: sfx_ui_warning (0.70s)
$t = New-Object SfxEngineV2+Track(0.70)
[SfxEngineV2]::AddModalTone($t, 0.00, 520.0, 0.12, 35.0, 0.55, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.10, 520.0, 0.12, 35.0, 0.50, 0.0)
[SfxEngineV2]::AddFluteNote($t, 0.08, 261.63, 0.45, 0.45, -0.2)
[SfxEngineV2]::AddFluteNote($t, 0.08, 392.00, 0.45, 0.45, 0.2)
Save-Dual $t "sfx/ui/sfx_ui_warning.wav" 0.86 0.12

# UI-05: sfx_ui_error_soft (0.48s)
$t = New-Object SfxEngineV2+Track(0.48)
[SfxEngineV2]::AddModalTone($t, 0.00, 240.0, 0.15, 30.0, 0.55, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.10, 210.0, 0.20, 25.0, 0.50, 0.0)
[SfxEngineV2]::AddPluck($t, 0.02, 146.8, 0.30, 0.40, -0.1)
[SfxEngineV2]::AddPluck($t, 0.10, 138.6, 0.30, 0.35, 0.1)
Save-Dual $t "sfx/ui/sfx_ui_error_soft.wav" 0.84 0.08

# UI-06: sfx_points_gain (0.90s)
$t = New-Object SfxEngineV2+Track(0.90)
$pNotes = @(523.25, 659.25, 783.99, 1046.50)
for ($i = 0; $i -lt 4; $i++) {
    $time = $i * 0.08
    $pan = if ($i % 2 -eq 0) { -0.25 } else { 0.25 }
    [SfxEngineV2]::AddModalTone($t, $time, $pNotes[$i], 0.50, 9.0, 0.50, $pan)
    [SfxEngineV2]::AddModalTone($t, $time, $pNotes[$i] * 2.76, 0.25, 20.0, 0.25, $pan)
}
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.30, 2000.0, 5000.0, 0.35, 0.0, $true)
Save-Dual $t "sfx/ui/sfx_ui_points_gain.wav" 0.88 0.18

# UI-07: sfx_rank_reveal (EXTENDED: 2.80s! Mallet roll + celebratory brass/flute fanfare)
Write-Host "Updating UI-07: sfx_rank_reveal (Extended to 2.80s)..."
$t = New-Object SfxEngineV2+Track(2.80)
# Drum/Mallet roll buildup (0.0s ~ 0.75s)
for ($i = 0; $i -lt 14; $i++) {
    $rt = $i * 0.05
    $amp = 0.20 + ($i / 14.0) * 0.45
    $rollPan = if ($i % 2 -eq 0) { -0.2 } else { 0.2 }
    [SfxEngineV2]::AddModalTone($t, $rt, 130.0 + $i * 3.0, 0.12, 22.0, $amp, $rollPan)
}
# Crash / Mallet accent on 0.75s
[SfxEngineV2]::AddModalTone($t, 0.75, 98.0, 0.50, 12.0, 0.65, 0.0)
[SfxEngineV2]::AddTexturedNoise($t, 0.75, 0.45, 1200.0, 4500.0, 0.45, 0.0, $true)
# Triumphant Brass & Flute Fanfare
# F4 -> A4 -> C5 -> F5 grand resolution
[SfxEngineV2]::AddHornNote($t, 0.75, 349.23, 0.30, 0.50, -0.2) # F4
[SfxEngineV2]::AddHornNote($t, 0.98, 440.00, 0.30, 0.52, -0.1) # A4
[SfxEngineV2]::AddHornNote($t, 1.22, 523.25, 0.35, 0.55, 0.1)  # C5
[SfxEngineV2]::AddHornNote($t, 1.50, 698.46, 1.20, 0.62, 0.0)  # F5 Grand Hold
# Flute harmony
[SfxEngineV2]::AddFluteNote($t, 1.50, 698.46, 1.20, 0.45, 0.1)
[SfxEngineV2]::AddFluteNote($t, 1.50, 880.00, 1.20, 0.40, -0.1) # A5
# High sparkle chime cascade
$chimeCascade = @(1046.50, 1318.51, 1567.98)
for ($c = 0; $c -lt $chimeCascade.Count; $c++) {
    [SfxEngineV2]::AddModalTone($t, 1.55 + $c * 0.12, $chimeCascade[$c], 1.0, 4.0, 0.40, ($c - 1) * 0.25)
}
Save-Dual $t "sfx/ui/sfx_ui_rank_reveal.wav" 0.90 0.22

# UI-08: sfx_medal_award (EXTENDED: 2.50s! Upward harp strum + glorious golden chimes)
Write-Host "Updating UI-08: sfx_medal_award (Extended to 2.50s)..."
$t = New-Object SfxEngineV2+Track(2.50)
# Upward harp glissando (0.0s ~ 0.5s)
$harpNotes = @(196.0, 246.9, 293.7, 392.0, 493.9, 587.3, 784.0)
for ($i = 0; $i -lt $harpNotes.Count; $i++) {
    [SfxEngineV2]::AddPluck($t, $i * 0.05, $harpNotes[$i], 0.9, 0.42, ($i - 3) * 0.12)
}
# Glorious golden cathedral bells on 0.45s (G5, B5, D6, G6)
[SfxEngineV2]::AddModalTone($t, 0.45, 783.99, 1.8, 3.2, 0.55, -0.25) # G5
[SfxEngineV2]::AddModalTone($t, 0.50, 987.77, 1.8, 3.0, 0.52, 0.25)  # B5
[SfxEngineV2]::AddModalTone($t, 0.55, 1174.66, 1.8, 2.8, 0.48, 0.0)  # D6
[SfxEngineV2]::AddModalTone($t, 0.62, 1567.98, 1.8, 2.5, 0.42, 0.1)  # G6
# Warm strings support
$medalChord = @([double]196.0, [double]293.7, [double]392.0, [double]493.9)
[SfxEngineV2]::AddPadChord($t, 0.45, $medalChord, 1.8, 0.45)
Save-Dual $t "sfx/ui/sfx_ui_medal_award.wav" 0.90 0.24


# =========================================================================
# 2. 구매와 준비 (PR-01, PR-02, PR-03)
# =========================================================================

# PR-01: sfx_unit_purchase (1.00s)
$t = New-Object SfxEngineV2+Track(1.00)
[SfxEngineV2]::AddModalTone($t, 0.00, 160.0, 0.15, 25.0, 0.55, -0.2)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.08, 1000.0, 1600.0, 0.40, -0.2, $true)
[SfxEngineV2]::AddModalTone($t, 0.14, 180.0, 0.15, 25.0, 0.58, 0.2)
[SfxEngineV2]::AddTexturedNoise($t, 0.14, 0.08, 1100.0, 1700.0, 0.42, 0.2, $true)
[SfxEngineV2]::AddModalTone($t, 0.30, 920.0, 0.10, 50.0, 0.60, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.30, 587.33, 0.55, 8.0, 0.48, 0.1)
[SfxEngineV2]::AddModalTone($t, 0.38, 880.00, 0.50, 7.0, 0.45, -0.1)
Save-Dual $t "sfx/preparation/sfx_unit_purchase.wav" 0.88 0.15

# PR-02: sfx_hint_purchase (AUDIBLE & TACTILE: 1.10s! Clear coin clink + paper unfold + kalimba)
Write-Host "Updating PR-02: sfx_hint_purchase (Loud, clear paper + coin clink + kalimba)..."
$t = New-Object SfxEngineV2+Track(1.10)
# 1. Distinct point/coin token clink (dual bell chime)
[SfxEngineV2]::AddModalTone($t, 0.00, 1318.51, 0.25, 25.0, 0.65, -0.2) # E6
[SfxEngineV2]::AddModalTone($t, 0.04, 1975.53, 0.25, 28.0, 0.55, 0.2)  # B6
# 2. Audible, crisp map/scroll paper unfurling rustle
[SfxEngineV2]::AddTexturedNoise($t, 0.08, 0.35, 1200.0, 3200.0, 0.65, 0.0, $false)
[SfxEngineV2]::AddTexturedNoise($t, 0.22, 0.28, 2200.0, 4200.0, 0.55, 0.1, $false)
# 3. Bright, curious Kalimba glissando: D5 -> F#5 -> A5 -> D6
$kNotes = @(587.33, 739.99, 880.00, 1174.66)
for ($k = 0; $k -lt 4; $k++) {
    [SfxEngineV2]::AddModalTone($t, 0.35 + $k * 0.12, $kNotes[$k], 0.60, 7.0, 0.55, ($k - 1.5) * 0.2)
}
Save-Dual $t "sfx/preparation/sfx_hint_purchase.wav" 0.90 0.18

# PR-03: sfx_hint_reveal (AUDIBLE & MAGICAL: 1.60s! Mist whoosh + mystical chord + crystal bell)
Write-Host "Updating PR-03: sfx_hint_reveal (Loud, magical pad swell + bell triad)..."
$t = New-Object SfxEngineV2+Track(1.60)
# 1. Audible rushing wind / mist dispersal
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.70, 800.0, 2800.0, 0.65, 0.0, $false)
# 2. Warm mystical pad chord swell (D Lydian mystery: D4, F#4, G#4, C#5)
$hChord = @([double]293.66, [double]369.99, [double]415.30, [double]554.37)
[SfxEngineV2]::AddPadChord($t, 0.10, $hChord, 1.40, 0.60)
# 3. Clear crystalline bell chime cluster (high presence, distinctly audible!)
[SfxEngineV2]::AddModalTone($t, 0.30, 830.61, 1.10, 4.0, 0.55, -0.25)  # G#5
[SfxEngineV2]::AddModalTone($t, 0.45, 1108.73, 1.10, 3.5, 0.58, 0.0)   # C#6
[SfxEngineV2]::AddModalTone($t, 0.60, 1479.98, 1.10, 3.0, 0.55, 0.25)  # F#6
[SfxEngineV2]::AddFluteNote($t, 0.45, 554.37, 0.90, 0.45, 0.0)
Save-Dual $t "sfx/preparation/sfx_hint_reveal.wav" 0.90 0.22


# =========================================================================
# 3. 영웅 카드 공개 (HR-01 ~ HR-07)
# =========================================================================

# HR-01: sfx_hero_card_shake (0.90s)
$t = New-Object SfxEngineV2+Track(0.90)
for ($i = 0; $i -lt 12; $i++) {
    $time = $i * 0.065
    $pan = if ($i % 2 -eq 0) { -0.3 } else { 0.3 }
    [SfxEngineV2]::AddModalTone($t, $time, 520.0, 0.06, 50.0, (0.25 + $i * 0.025), $pan)
    [SfxEngineV2]::AddModalTone($t, $time, 85.0, 0.07, 30.0, 0.35, 0.0)
}
Save-Dual $t "sfx/hero/sfx_hero_card_shake.wav" 0.86 0.10

# HR-02: sfx_hero_card_glow (1.45s)
$t = New-Object SfxEngineV2+Track(1.45)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 1.20, 1200.0, 3800.0, 0.55, 0.0, $true)
$glowNotes = @(659.25, 830.61, 987.77, 1318.51)
for ($i = 0; $i -lt 4; $i++) {
    [SfxEngineV2]::AddModalTone($t, 0.25 + $i * 0.18, $glowNotes[$i], 0.85, 5.0, 0.48, ($i - 1.5) * 0.2)
}
Save-Dual $t "sfx/hero/sfx_hero_card_glow.wav" 0.88 0.24

# HR-03: sfx_hero_card_flip (AUDIBLE & CRISP: 0.60s! Fast whoosh + solid card slap)
Write-Host "Updating HR-03: sfx_hero_card_flip (Loud, fast air whoosh + solid snap)..."
$t = New-Object SfxEngineV2+Track(0.60)
# Fast cutting air whoosh (sweeping 600Hz -> 3200Hz)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.28, 600.0, 3400.0, 0.75, -0.2, $true)
# Solid tactile card board slap & table knock on 0.22s
[SfxEngineV2]::AddModalTone($t, 0.22, 750.0, 0.10, 50.0, 0.70, 0.1) # card snap
[SfxEngineV2]::AddModalTone($t, 0.22, 1950.0, 0.06, 80.0, 0.50, 0.1) # top click
[SfxEngineV2]::AddModalTone($t, 0.22, 160.0, 0.15, 30.0, 0.60, 0.0) # bottom thud
Save-Dual $t "sfx/hero/sfx_hero_card_flip.wav" 0.90 0.08


# =========================================================================
# 영웅 카드 공개 3종: UNIFIED SIGNATURE MELODY WITH TIERED FX LAYERS!
# Unified Melody Theme: C5 -> G5 -> A5 -> C6 (도 - 솔 - 라 - 높은 도)
# =========================================================================

# HR-04: st_hero_common_reveal (2.40s) - Base Melody + Leaf flutter + Woodblock
Write-Host "Updating HR-04: st_hero_common_reveal (Unified Theme: Common Leaf/Wood)..."
$t = New-Object SfxEngineV2+Track(2.40)
# Tier FX: Fresh forest wind & fluttering leaves
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.60, 1800.0, 3600.0, 0.50, 0.0, $false)
[SfxEngineV2]::AddModalTone($t, 0.10, 880.0, 0.08, 60.0, 0.45, -0.2)
[SfxEngineV2]::AddModalTone($t, 0.22, 1050.0, 0.08, 60.0, 0.48, 0.2)
# Core Hero Melody (Wood Flute Lead + Pizzicato)
# 0.4s: C5 | 0.7s: G5 | 1.0s: A5 | 1.3s: C6
[SfxEngineV2]::AddFluteNote($t, 0.40, 523.25, 0.28, 0.52, 0.0)  # C5
[SfxEngineV2]::AddPluck($t, 0.40, 261.63, 0.50, 0.40, -0.2)
[SfxEngineV2]::AddFluteNote($t, 0.70, 783.99, 0.28, 0.55, 0.0)  # G5
[SfxEngineV2]::AddPluck($t, 0.70, 392.00, 0.50, 0.42, 0.2)
[SfxEngineV2]::AddFluteNote($t, 1.00, 880.00, 0.32, 0.58, 0.0)  # A5
[SfxEngineV2]::AddPluck($t, 1.00, 440.00, 0.50, 0.44, -0.2)
[SfxEngineV2]::AddFluteNote($t, 1.30, 1046.50, 0.95, 0.62, 0.0) # C6 (Hold)
[SfxEngineV2]::AddModalTone($t, 1.30, 1046.50, 0.90, 5.0, 0.45, 0.2) # Glockenspiel accent
Save-Dual $t "sfx/hero/st_hero_common_reveal.wav" 0.90 0.18

# HR-05: st_hero_rare_reveal (2.80s) - Base Melody + Blue Magic Pulse + Kalimba & Strings
Write-Host "Updating HR-05: st_hero_rare_reveal (Unified Theme: Rare Blue Magic/Kalimba)..."
$t = New-Object SfxEngineV2+Track(2.80)
# Tier FX: Blue magic particle sweep & shimmer
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 0.80, 1500.0, 4500.0, 0.60, 0.0, $true)
$rareChord = @([double]261.63, [double]392.00, [double]523.25, [double]659.25)
[SfxEngineV2]::AddPadChord($t, 0.20, $rareChord, 2.0, 0.50)
# Core Hero Melody (Wood Flute Lead)
[SfxEngineV2]::AddFluteNote($t, 0.40, 523.25, 0.28, 0.52, -0.1) # C5
[SfxEngineV2]::AddFluteNote($t, 0.70, 783.99, 0.28, 0.55, -0.1) # G5
[SfxEngineV2]::AddFluteNote($t, 1.00, 880.00, 0.32, 0.58, -0.1) # A5
[SfxEngineV2]::AddFluteNote($t, 1.30, 1046.50, 1.20, 0.62, 0.0)  # C6 (Hold)
# RARE TIER LAYER: Octave Kalimba & Chime Melody Double
[SfxEngineV2]::AddModalTone($t, 0.40, 1046.50, 0.80, 6.0, 0.50, 0.2) # C6
[SfxEngineV2]::AddModalTone($t, 0.70, 1567.98, 0.80, 5.5, 0.52, 0.2) # G6
[SfxEngineV2]::AddModalTone($t, 1.00, 1760.00, 0.80, 5.0, 0.55, 0.2) # A6
[SfxEngineV2]::AddModalTone($t, 1.30, 2093.00, 1.30, 4.0, 0.58, 0.0) # C7
Save-Dual $t "sfx/hero/st_hero_rare_reveal.wav" 0.90 0.22

# HR-06: st_hero_legendary_reveal (3.60s) - Base Melody + Golden Brass + Bass Impact + Starlight Cascade
Write-Host "Updating HR-06: st_hero_legendary_reveal (Unified Theme: Legendary Golden Brass/Impact)..."
$t = New-Object SfxEngineV2+Track(3.60)
# Tier FX 1: Deep Ground Impact Thump & Golden Burst
[SfxEngineV2]::AddModalTone($t, 0.00, 75.0, 0.60, 10.0, 0.75, 0.0)
[SfxEngineV2]::AddTexturedNoise($t, 0.00, 1.10, 1000.0, 5500.0, 0.65, 0.0, $true)
$legendChord = @([double]130.81, [double]196.00, [double]261.63, [double]329.63, [double]392.00)
[SfxEngineV2]::AddPadChord($t, 0.20, $legendChord, 2.8, 0.55)
# Core Hero Melody (Wood Flute)
[SfxEngineV2]::AddFluteNote($t, 0.40, 523.25, 0.28, 0.52, 0.0) # C5
[SfxEngineV2]::AddFluteNote($t, 0.70, 783.99, 0.28, 0.55, 0.0) # G5
[SfxEngineV2]::AddFluteNote($t, 1.00, 880.00, 0.32, 0.58, 0.0) # A5
[SfxEngineV2]::AddFluteNote($t, 1.30, 1046.50, 1.80, 0.65, 0.0) # C6 Grand Hold
# LEGENDARY TIER LAYER 1: Mighty Brass Horn Ensemble Unison!
[SfxEngineV2]::AddHornNote($t, 0.40, 261.63, 0.30, 0.55, -0.2) # C4 Horn
[SfxEngineV2]::AddHornNote($t, 0.70, 392.00, 0.30, 0.58, -0.2) # G4 Horn
[SfxEngineV2]::AddHornNote($t, 1.00, 440.00, 0.35, 0.62, -0.2) # A4 Horn
[SfxEngineV2]::AddHornNote($t, 1.30, 523.25, 1.80, 0.68, 0.0)  # C5 Horn Grand Hold
# LEGENDARY TIER LAYER 2: Radiant Starlight Chime Cascade
$starCascade = @(2093.00, 1760.00, 1567.98, 1318.51, 1046.50, 783.99)
for ($s = 0; $s -lt $starCascade.Count; $s++) {
    [SfxEngineV2]::AddModalTone($t, 1.35 + $s * 0.12, $starCascade[$s], 1.4, 3.5, 0.48, ($s - 2.5) * 0.18)
}
Save-Dual $t "sfx/hero/st_hero_legendary_reveal.wav" 0.90 0.25

# HR-07: sfx_hero_added (1.00s)
$t = New-Object SfxEngineV2+Track(1.00)
[SfxEngineV2]::AddModalTone($t, 0.00, 140.0, 0.22, 25.0, 0.60, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.00, 720.0, 0.07, 60.0, 0.55, 0.0)
[SfxEngineV2]::AddModalTone($t, 0.06, 783.99, 0.70, 6.0, 0.50, -0.15)
[SfxEngineV2]::AddModalTone($t, 0.10, 1174.66, 0.70, 5.0, 0.48, 0.15)
Save-Dual $t "sfx/hero/sfx_hero_added.wav" 0.88 0.15

Write-Host "--- Updated SFX Successfully Rendered! ---"
