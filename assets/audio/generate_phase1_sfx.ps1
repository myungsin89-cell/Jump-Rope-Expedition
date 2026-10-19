$csCode = Get-Content -Raw -Path "assets/audio/SfxEngine.cs"
if (-not ([System.Management.Automation.PSTypeName]'SfxEngine').Type) {
    Add-Type -TypeDefinition $csCode
}

function Save-Dual($track, $relPath, $targetPeak = 0.89, $reverb = 0.15) {
    $fullWeb = "assets/audio/$relPath"
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($relPath)
    $fullMaster = "assets/audio/masters/${fileName}_master.wav"
    [SfxEngine]::MasterAndSave($track, $fullWeb, $targetPeak, $reverb)
    [SfxEngine]::MasterAndSave($track, $fullMaster, $targetPeak, $reverb)
}

Write-Host "--- Generating Phase 1 SFX (18 Sounds) ---"

# =========================================================================
# 1. 공통 UI (8종)
# =========================================================================

# UI-01: sfx_ui_tap (0.12s) - Crisp warm woodblock tap
Write-Host "Generating UI-01: sfx_ui_tap..."
$t = New-Object SfxEngine+Track(0.14)
[SfxEngine]::AddModalTone($t, 0.00, 840.0, 0.08, 65.0, 0.65, 0.0)
[SfxEngine]::AddModalTone($t, 0.00, 1920.0, 0.05, 90.0, 0.35, 0.1)
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.03, 3200.0, 4.0, 0.30, 0.0, $false)
Save-Dual $t "sfx/ui/sfx_ui_tap.wav" 0.85 0.06

# UI-02: sfx_ui_confirm (0.50s) - Wood tap + rising two-tone kalimba ding-dong (G5 -> C6)
Write-Host "Generating UI-02: sfx_ui_confirm..."
$t = New-Object SfxEngine+Track(0.55)
[SfxEngine]::AddModalTone($t, 0.00, 784.0, 0.35, 12.0, 0.50, -0.2) # G5
[SfxEngine]::AddModalTone($t, 0.08, 1046.5, 0.40, 10.0, 0.55, 0.2)  # C6
[SfxEngine]::AddModalTone($t, 0.00, 520.0, 0.08, 50.0, 0.30, 0.0)   # wood snap
Save-Dual $t "sfx/ui/sfx_ui_confirm.wav" 0.88 0.14

# UI-03: sfx_ui_cancel (0.35s) - Soft wood thud + descending marimba (E4 -> C4)
Write-Host "Generating UI-03: sfx_ui_cancel..."
$t = New-Object SfxEngine+Track(0.38)
[SfxEngine]::AddModalTone($t, 0.00, 329.6, 0.22, 22.0, 0.45, -0.1) # E4
[SfxEngine]::AddModalTone($t, 0.07, 261.6, 0.25, 18.0, 0.40, 0.1)  # C4
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.05, 1400.0, 2.5, 0.25, 0.0, $false)
Save-Dual $t "sfx/ui/sfx_ui_cancel.wav" 0.82 0.08

# UI-04: sfx_ui_warning (0.65s) - Soft temple block knock + woodwind 5th interval (A3 + E4)
Write-Host "Generating UI-04: sfx_ui_warning..."
$t = New-Object SfxEngine+Track(0.70)
[SfxEngine]::AddModalTone($t, 0.00, 480.0, 0.12, 35.0, 0.45, 0.0)
[SfxEngine]::AddModalTone($t, 0.08, 480.0, 0.12, 35.0, 0.40, 0.0)
[SfxEngine]::AddFluteNote($t, 0.05, 220.0, 0.45, 0.35, -0.2) # A3
[SfxEngine]::AddFluteNote($t, 0.05, 329.6, 0.45, 0.35, 0.2)  # E4
Save-Dual $t "sfx/ui/sfx_ui_warning.wav" 0.85 0.12

# UI-05: sfx_ui_error_soft (0.45s) - Soft muted thud + gentle string wobble
Write-Host "Generating UI-05: sfx_ui_error_soft..."
$t = New-Object SfxEngine+Track(0.48)
[SfxEngine]::AddModalTone($t, 0.00, 240.0, 0.15, 30.0, 0.50, 0.0)
[SfxEngine]::AddModalTone($t, 0.10, 210.0, 0.20, 25.0, 0.45, 0.0)
[SfxEngine]::AddPluck($t, 0.02, 146.8, 0.30, 0.35, -0.1)
[SfxEngine]::AddPluck($t, 0.10, 138.6, 0.30, 0.30, 0.1)
Save-Dual $t "sfx/ui/sfx_ui_error_soft.wav" 0.82 0.08

# UI-06: sfx_points_gain (0.85s) - Rolling acorn bells + glockenspiel rising arpeggio (C5-E5-G5-C6)
Write-Host "Generating UI-06: sfx_points_gain..."
$t = New-Object SfxEngine+Track(0.90)
$pNotes = @(523.25, 659.25, 783.99, 1046.50)
for ($i = 0; $i -lt 4; $i++) {
    $time = $i * 0.08
    $pan = if ($i % 2 -eq 0) { -0.25 } else { 0.25 }
    [SfxEngine]::AddModalTone($t, $time, $pNotes[$i], 0.45, 9.0, 0.45, $pan)
    [SfxEngine]::AddModalTone($t, $time, $pNotes[$i] * 2.76, 0.20, 20.0, 0.18, $pan) # chime overtone
}
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.25, 4500.0, 3.0, 0.22, 0.0, $true)
Save-Dual $t "sfx/ui/sfx_ui_points_gain.wav" 0.88 0.18

# UI-07: sfx_rank_reveal (1.35s) - Mallet drum roll + proud friendly brass fanfare (F4 -> A4 -> C5 -> F5)
Write-Host "Generating UI-07: sfx_rank_reveal..."
$t = New-Object SfxEngine+Track(1.40)
# Roll
for ($i = 0; $i -lt 8; $i++) {
    $rt = $i * 0.045
    [SfxEngine]::AddModalTone($t, $rt, 120.0, 0.10, 25.0, (0.2 + $i * 0.03), 0.0)
}
# Fanfare
[SfxEngine]::AddHornNote($t, 0.38, 349.2, 0.22, 0.40, -0.2) # F4
[SfxEngine]::AddHornNote($t, 0.55, 440.0, 0.22, 0.42, 0.0)  # A4
[SfxEngine]::AddHornNote($t, 0.72, 523.2, 0.25, 0.45, 0.2)  # C5
[SfxEngine]::AddHornNote($t, 0.92, 698.5, 0.45, 0.52, 0.0)  # F5
[SfxEngine]::AddFluteNote($t, 0.92, 698.5, 0.45, 0.38, 0.1) # Flute double
Save-Dual $t "sfx/ui/sfx_ui_rank_reveal.wav" 0.89 0.20

# UI-08: sfx_medal_award (1.10s) - Golden chime bell chord (G5, B5, D6) + warm upward harp strum
Write-Host "Generating UI-08: sfx_medal_award..."
$t = New-Object SfxEngine+Track(1.15)
$hNotes = @(196.0, 246.9, 293.7, 392.0, 493.9, 587.3)
for ($i = 0; $i -lt $hNotes.Count; $i++) {
    [SfxEngine]::AddPluck($t, $i * 0.035, $hNotes[$i], 0.7, 0.35, ($i - 2.5) * 0.15)
}
[SfxEngine]::AddModalTone($t, 0.22, 783.99, 0.8, 5.0, 0.48, -0.2) # G5
[SfxEngine]::AddModalTone($t, 0.25, 987.77, 0.8, 5.0, 0.45, 0.2)  # B5
[SfxEngine]::AddModalTone($t, 0.28, 1174.66, 0.8, 5.0, 0.42, 0.0) # D6
Save-Dual $t "sfx/ui/sfx_ui_medal_award.wav" 0.88 0.22


# =========================================================================
# 2. 구매와 준비 (3종)
# =========================================================================

# PR-01: sfx_unit_purchase (0.95s) - Wood snap + marching footstep + settle placement 'chak'
Write-Host "Generating PR-01: sfx_unit_purchase..."
$t = New-Object SfxEngine+Track(1.00)
# Footstep 1, 2
[SfxEngine]::AddModalTone($t, 0.00, 160.0, 0.15, 25.0, 0.45, -0.2)
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.06, 1200.0, 2.0, 0.30, -0.2, $false)
[SfxEngine]::AddModalTone($t, 0.14, 180.0, 0.15, 25.0, 0.48, 0.2)
[SfxEngine]::AddNoiseBurst($t, 0.14, 0.06, 1300.0, 2.0, 0.32, 0.2, $false)
# Placement lock 'chak' + bell
[SfxEngine]::AddModalTone($t, 0.30, 920.0, 0.10, 50.0, 0.50, 0.0) # wood snap
[SfxEngine]::AddModalTone($t, 0.30, 587.33, 0.55, 8.0, 0.40, 0.1) # D5 chime
[SfxEngine]::AddModalTone($t, 0.38, 880.00, 0.50, 7.0, 0.38, -0.1) # A5 chime
Save-Dual $t "sfx/preparation/sfx_unit_purchase.wav" 0.88 0.15

# PR-02: sfx_hint_purchase (0.90s) - Map scroll paper rustle + curious kalimba glide (D5 -> F#5 -> A5)
Write-Host "Generating PR-02: sfx_hint_purchase..."
$t = New-Object SfxEngine+Track(0.95)
# Paper rustle
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.20, 2800.0, 2.0, 0.35, -0.1, $true)
[SfxEngine]::AddNoiseBurst($t, 0.12, 0.25, 3200.0, 2.5, 0.30, 0.1, $false)
# Curious Kalimba
[SfxEngine]::AddModalTone($t, 0.18, 587.33, 0.50, 9.0, 0.42, -0.2) # D5
[SfxEngine]::AddModalTone($t, 0.30, 739.99, 0.50, 8.5, 0.45, 0.0)  # F#5
[SfxEngine]::AddModalTone($t, 0.42, 880.00, 0.50, 8.0, 0.48, 0.2)  # A5
Save-Dual $t "sfx/preparation/sfx_hint_purchase.wav" 0.86 0.16

# PR-03: sfx_hint_reveal (1.40s) - Mist dispersal whoosh + mystical glockenspiel triad
Write-Host "Generating PR-03: sfx_hint_reveal..."
$t = New-Object SfxEngine+Track(1.45)
# Mist whoosh
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.45, 1800.0, 1.8, 0.38, 0.0, $true)
# Mystical Glockenspiel triad (D5, G#5, C#6) - Lydian mysterious chord
[SfxEngine]::AddModalTone($t, 0.20, 587.33, 0.90, 4.5, 0.40, -0.25)
[SfxEngine]::AddModalTone($t, 0.32, 830.61, 0.90, 4.0, 0.42, 0.0)
[SfxEngine]::AddModalTone($t, 0.44, 1108.73, 0.90, 3.5, 0.45, 0.25)
[SfxEngine]::AddFluteNote($t, 0.44, 554.37, 0.70, 0.32, 0.0) # C#5 pad
Save-Dual $t "sfx/preparation/sfx_hint_reveal.wav" 0.88 0.22


# =========================================================================
# 3. 영웅 카드 공개 (7종)
# =========================================================================

# HR-01: sfx_hero_card_shake (0.85s) - Trembling wood card vibration
Write-Host "Generating HR-01: sfx_hero_card_shake..."
$t = New-Object SfxEngine+Track(0.90)
for ($i = 0; $i -lt 12; $i++) {
    $time = $i * 0.065
    $pan = if ($i % 2 -eq 0) { -0.3 } else { 0.3 }
    [SfxEngine]::AddModalTone($t, $time, 520.0, 0.06, 50.0, (0.2 + $i * 0.02), $pan)
    [SfxEngine]::AddModalTone($t, $time, 85.0, 0.07, 30.0, 0.25, 0.0) # low rattle
}
Save-Dual $t "sfx/hero/sfx_hero_card_shake.wav" 0.85 0.10

# HR-02: sfx_hero_card_glow (1.40s) - Upward magic particles & shimmer sweep
Write-Host "Generating HR-02: sfx_hero_card_glow..."
$t = New-Object SfxEngine+Track(1.45)
[SfxEngine]::AddNoiseBurst($t, 0.00, 1.10, 2200.0, 3.5, 0.40, 0.0, $true)
# Rising star bells (E5 -> G#5 -> B5 -> E6)
$glowNotes = @(659.25, 830.61, 987.77, 1318.51)
for ($i = 0; $i -lt 4; $i++) {
    [SfxEngine]::AddModalTone($t, 0.25 + $i * 0.18, $glowNotes[$i], 0.75, 5.0, 0.40, ($i - 1.5) * 0.2)
}
Save-Dual $t "sfx/hero/sfx_hero_card_glow.wav" 0.88 0.24

# HR-03: sfx_hero_card_flip (0.55s) - Crisp thick card whoosh + solid snap face-up
Write-Host "Generating HR-03: sfx_hero_card_flip..."
$t = New-Object SfxEngine+Track(0.60)
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.22, 2400.0, 2.0, 0.45, -0.3, $true)
[SfxEngine]::AddModalTone($t, 0.18, 680.0, 0.08, 55.0, 0.55, 0.2) # snap
[SfxEngine]::AddModalTone($t, 0.18, 140.0, 0.12, 35.0, 0.45, 0.0) # body
Save-Dual $t "sfx/hero/sfx_hero_card_flip.wav" 0.86 0.08

# HR-04: st_hero_common_reveal (2.00s) - Common (숲빛·나뭇잎, 산뜻한 플루트·우드블록)
Write-Host "Generating HR-04: st_hero_common_reveal..."
$t = New-Object SfxEngine+Track(2.10)
# Leaf rustle
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.30, 3200.0, 2.5, 0.35, 0.0, $true)
# Woodblock bounce
[SfxEngine]::AddModalTone($t, 0.10, 880.0, 0.07, 60.0, 0.40, -0.2)
[SfxEngine]::AddModalTone($t, 0.22, 1050.0, 0.07, 60.0, 0.42, 0.2)
# Joyful flute tune: G4 -> B4 -> D5 -> G5
[SfxEngine]::AddFluteNote($t, 0.15, 392.00, 0.25, 0.42, -0.1) # G4
[SfxEngine]::AddFluteNote($t, 0.35, 493.88, 0.25, 0.44, 0.0)  # B4
[SfxEngine]::AddFluteNote($t, 0.55, 587.33, 0.30, 0.46, 0.1)  # D5
[SfxEngine]::AddFluteNote($t, 0.80, 783.99, 0.90, 0.50, 0.0)  # G5 hold
[SfxEngine]::AddModalTone($t, 0.80, 783.99, 0.90, 4.0, 0.38, 0.2) # Glockenspiel accent
Save-Dual $t "sfx/hero/st_hero_common_reveal.wav" 0.88 0.18

# HR-05: st_hero_rare_reveal (2.50s) - Rare (푸른빛·마법 입자, 신비로운 칼림바 & 스트링 팡파르)
Write-Host "Generating HR-05: st_hero_rare_reveal..."
$t = New-Object SfxEngine+Track(2.60)
# Blue shimmer
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.50, 4000.0, 3.0, 0.38, 0.0, $true)
# Kalimba flourish: D5 -> F#5 -> A5 -> D6
$rareNotes = @(587.33, 739.99, 880.00, 1174.66)
for ($i = 0; $i -lt 4; $i++) {
    [SfxEngine]::AddModalTone($t, 0.15 + $i * 0.12, $rareNotes[$i], 1.2, 4.5, 0.45, ($i - 1.5) * 0.2)
}
# Horn counterpoint
[SfxEngine]::AddHornNote($t, 0.55, 587.33, 0.40, 0.42, -0.2) # D5
[SfxEngine]::AddHornNote($t, 0.90, 880.00, 1.20, 0.48, 0.0)  # A5
[SfxEngine]::AddFluteNote($t, 0.90, 1174.66, 1.20, 0.45, 0.2) # D6
Save-Dual $t "sfx/hero/st_hero_rare_reveal.wav" 0.89 0.22

# HR-06: st_hero_legendary_reveal (3.20s) - Legendary (금빛·별빛, 장엄한 호른과 찬란한 글로켄슈필)
Write-Host "Generating HR-06: st_hero_legendary_reveal..."
$t = New-Object SfxEngine+Track(3.30)
# Deep warm bass impact
[SfxEngine]::AddModalTone($t, 0.00, 98.0, 0.50, 10.0, 0.55, 0.0)
[SfxEngine]::AddNoiseBurst($t, 0.00, 0.60, 5000.0, 3.5, 0.42, 0.0, $true)
# Brass triumphant fanfare: D4 -> G4 -> B4 -> D5 -> G5
[SfxEngine]::AddHornNote($t, 0.20, 293.66, 0.30, 0.44, -0.2) # D4
[SfxEngine]::AddHornNote($t, 0.45, 392.00, 0.30, 0.46, -0.1) # G4
[SfxEngine]::AddHornNote($t, 0.70, 493.88, 0.35, 0.48, 0.1)  # B4
[SfxEngine]::AddHornNote($t, 1.00, 587.33, 0.40, 0.50, 0.2)  # D5
[SfxEngine]::AddHornNote($t, 1.35, 783.99, 1.50, 0.55, 0.0)  # G5 Grand hold
[SfxEngine]::AddFluteNote($t, 1.35, 1567.98, 1.50, 0.42, 0.0) # High G6 double
# Crystalline bell waterfall
$bellWaterfall = @(1567.98, 1318.51, 1174.66, 987.77, 783.99)
for ($b = 0; $b -lt $bellWaterfall.Count; $b++) {
    [SfxEngine]::AddModalTone($t, 1.35 + $b * 0.14, $bellWaterfall[$b], 1.2, 3.8, 0.40, ($b - 2) * 0.2)
}
Save-Dual $t "sfx/hero/st_hero_legendary_reveal.wav" 0.90 0.25

# HR-07: sfx_hero_added (0.95s) - Wooden stamp seal thump + compendium lock chime
Write-Host "Generating HR-07: sfx_hero_added..."
$t = New-Object SfxEngine+Track(1.00)
# Stamp thump
[SfxEngine]::AddModalTone($t, 0.00, 140.0, 0.22, 25.0, 0.55, 0.0)
[SfxEngine]::AddModalTone($t, 0.00, 720.0, 0.07, 60.0, 0.48, 0.0)
# Lock chime (G5 + D6)
[SfxEngine]::AddModalTone($t, 0.06, 783.99, 0.70, 6.0, 0.45, -0.15)
[SfxEngine]::AddModalTone($t, 0.10, 1174.66, 0.70, 5.0, 0.42, 0.15)
Save-Dual $t "sfx/hero/sfx_hero_added.wav" 0.88 0.15

Write-Host "--- All 18 SFX Successfully Rendered! ---"
