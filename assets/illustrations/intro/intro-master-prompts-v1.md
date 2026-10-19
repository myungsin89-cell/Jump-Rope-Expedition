# 인트로 스토리북 일러스트 마스터 프롬프트 (5 Scenes)

- 규격: 16:9 와이드스크린 (1672×941 또는 1920×1080)
- 화풍/기법: 2D 프리미엄 수채화 & 색연필 질감, 유기적 핸드드로운 라인아트, 종이 텍스처 `#FBFBF9`
- 디자인 철학: 따뜻하고 사랑스러운 숲속 판타지 (초등 교실용 친화적, 2.5~3.5등신)
- 제약사항: 이미지 내부에 텍스트/문자/숫자/UI 위젯 금지 (웹 HTML에서 오버레이 렌더링)

---

## Scene 1: 숲속의 부름과 세 원정대 (The Call of the Forest & 3 Expedition Teams)
- 파일명: `assets/illustrations/intro/intro-scene-1-expedition-teams.png`
- 스토리 텍스트:
  > **"3개의 원정대 팀이 숲속 모험을 시작합니다!"**  
  > 깊고 신비로운 마법의 숲에는 계절마다 깨어나는 비밀 보스들이 잠들어 있어요.  
  > 세 팀이 힘을 모아 숲의 평화를 되찾는 대모험을 떠나볼까요?

### 프롬프트
```text
Use case: stylized-concept
Asset type: 16:9 widescreen storybook illustration for an elementary classroom web game
Primary request: Scene 1 of the game intro storybook for "줄넘기 원정대". The beginning of the expedition. Do not render any text, UI, or typography.
Scene/backdrop: A warm morning sunrise over the entrance of an enchanted forest. Three distinct natural winding dirt paths flow forward into the deep misty woods. At the crossroads, three fluttering blank adventure pennant flags (one with forest leaf crest, one golden star crest, one river wave crest) mark the starting camp for the three student expedition teams. Warm glowing fireflies and morning dew.
Subjects: Small scouts (friendly acorn-capped explorers and little forest animals) packing wooden knapsacks and looking forward into the trail with excitement. Welcoming, adventurous, full of curiosity.
Style/medium: Premium 2D storybook illustration, gentle watercolor and colored-pencil textures on warm cream paper (#FBFBF9), organic hand-drawn linework, charming 3-head-tall proportions, warm forest fantasy aesthetic.
Composition/framing: 16:9 widescreen cinematic composition. Keep generous comfortable negative space in the lower-third or left-center for React text overlay. Distinct paths leading toward a glowing golden forest opening in the center-distance.
Lighting/mood: Fresh dawn sunlight streaming through trees, hopeful, cheerful, classroom-friendly adventure.
Color palette: Cream ivory #FBFBF9, deep forest green #1B4332, leaf sage #52B788, soft morning amber #E4A83A, sky blue accents.
Constraints: No text, no letters, no words, no user interface, no watermark, no dark horror, no weapons pointed at each other.
```

---

## Scene 2: 비밀 보스와 끝없는 시즌 원정 (Secret Bosses & Endless Seasons)
- 파일명: `assets/illustrations/intro/intro-scene-2-secret-bosses-seasons.png`
- 스토리 텍스트:
  > **"숲속 깊은 곳에는 바위 골렘부터 불꽃의 드래곤까지, 다양한 비밀 보스들이 잠들어 있습니다."**  
  > 하나의 보스를 잠재우면 다음 시즌에는 새로운 비밀 보스가 여러분을 기다립니다!  
  > 시즌을 거듭하며 우리 원정대의 전설을 완성해 나가세요.

### 프롬프트
```text
Use case: stylized-concept
Asset type: 16:9 widescreen storybook illustration for an elementary classroom web game
Primary request: Scene 2 of the game intro storybook for "줄넘기 원정대". The multi-season lore showing multiple secret forest bosses. Do not render any text, UI, or typography.
Scene/backdrop: A deep mystical ancient forest sanctuary with an ancient mossy stone shrine. Through starry constellations in the night sky and mystic glowing cave murals, the ethereal silhouettes of the 5 seasonal bosses are softly revealed: the mighty Rock Golem, the soaring Wind Wyvern, the ancient Thorn Treant, the snowy Ice Yeti, and the majestic Volcanic Dragon Kaiser.
Subjects: In the foreground, four friendly scouts (Acorn Explorer, Leaf Guardian, Starlight Fairy, Little Pig Hammer) stand beside a starry seasonal astrolabe or ancient stone map, looking in awe at the rotating constellations of the seasonal bosses. Shows a sense of endless multi-season adventure across seasons.
Style/medium: Premium 2D storybook illustration, gentle watercolor and colored-pencil textures on warm cream paper (#FBFBF9), whimsical hand-drawn linework, fairytale mystery rather than scary monster horror.
Composition/framing: 16:9 widescreen. Vast starlit sky and ancient stone carvings in upper half, small scouts in lower right corner gazing up. Ample clean negative space in the left/center for overlay text.
Lighting/mood: Deep indigo twilight with warm glowing golden runes and starry cyan highlights, wonder, legendary mystery.
Color palette: Warm cream base #FBFBF9, mystical indigo, moss green #2D5A27, soft glowing amber #E4A83A, celestial cyan.
Constraints: No text, no numbers, no words, no watermark, no gory monsters, no aggressive scary imagery.
```

---

## Scene 3: 함께 넘는 8자 줄넘기와 팀 포인트 (Team Figure-8 Long-Rope Jumping & Team Points)
- 파일명: `assets/illustrations/intro/intro-scene-3-jump-rope-hints.png`
- 규칙 근거: `docs/decision-log.md` D-006(포인트), D-008(병력 30P), D-009(힌트 100P)
- 스토리 텍스트(자막) 요약:
  > 바로 여러분이 다 함께 넘는 8자 줄넘기란다! 두 친구가 긴 줄을 돌리면, 한 명씩 달려 들어가 8자를 그리며 힘차게 넘는 거야.  
  > 경기가 끝나면 팀마다 팀 포인트(P)를 받는단다.
- 양피지: 포인트 얻는 법(참가 30P · 순위 +30/+20/+10 · 성장 +20 · 메달 +10), 포인트 쓰는 곳(병력 30P · 힌트 100P 시즌 1회 · 시즌마다 0P 시작)
- 주의: 개인 줄넘기(짧은 줄) 금지. 반드시 **긴 줄 1개를 두 명이 돌리는 8자 줄넘기**여야 함.

### 프롬프트
```text
Use case: stylized-concept
Asset type: 16:9 widescreen storybook illustration for an elementary classroom web game
Primary request: Scene 3 of the game intro storybook for "줄넘기 원정대". Korean "8자 줄넘기" = TEAM LONG-ROPE jumping (not individual jump rope). Do not render any text, UI, or typography.
Scene/backdrop: A sunny enchanted forest glade with ancient friendly trees and soft light shafts.
Subjects: Two friendly characters on the left and right hold the two ends of ONE very long thick rope swinging in a big arc. One acorn explorer jumps mid-air in the center. A pig warrior, leaf guardian, bunny and foxes queue up and cheer, ready to run in. A soft glowing golden figure-eight trail on the grass shows the jumpers' path. Golden sparkling point orbs float upward.
Style/medium: Premium 2D storybook illustration, watercolor and colored-pencil on warm cream paper (#FBFBF9), organic hand-drawn linework, charming 3-head-tall proportions.
Composition/framing: 16:9 widescreen, action centered, calm negative space in the lower third for subtitles.
Lighting/mood: Bright cheerful sunlight, joyful teamwork.
Color palette: Cream ivory #FBFBF9, forest green #1B4332, sage #52B788, amber #E4A83A.
Constraints: No text, letters, numbers or UI; NO individual short jump ropes; no horror or violence.
```

---

## Scene 4: 4대 정예 병력과 영웅의 소환 (Assemble 4 Troops & Summon Heroes)
- 파일명: `assets/illustrations/intro/intro-scene-4-troops-and-heroes.png`
- 스토리 텍스트:
  > **"보스의 특성에 맞춰 4대 정예 병력(도토리 궁수, 해머단, 잎사귀 방패, 별빛 요정)을 전략적으로 모으세요!"**  
  > 특별한 영웅 카드를 뽑으면 원정대 전체에 강력한 버프와 스킬이 발동합니다.  
  > 어떤 병력과 영웅을 선택하느냐가 승리의 열쇠예요!

### 프롬프트
```text
Use case: stylized-concept
Asset type: 16:9 widescreen storybook illustration for an elementary classroom web game
Primary request: Scene 4 of the game intro storybook for "줄넘기 원정대". The 4 troop classes and summoning glowing hero cards. Do not render any text, UI, or typography.
Scene/backdrop: An ancient mossy stone platform in a sun-dappled glade, etched with a softly glowing elemental circle.
Subjects: The four canonical troops standing proudly in a coordinated formation: (1) 도토리 탐험가 with acorn cap and mini bow, (2) 숲속 해머단 chubby pink piglet with green scarf and log hammer, (3) 잎사귀 수호자 leaf-armored soldier with broad leaf shield, (4) 별빛 요정 floating fairy with luminous wings. Above them in the air floats a majestic trio of glowing golden tarot-style hero cards radiating warm starlight and magic sparkles.
Style/medium: Premium 2D storybook illustration, rich watercolor and pencil texture on cream paper (#FBFBF9), lively expressive character designs, warm fantasy concept art.
Composition/framing: 16:9 widescreen. 4 troops organized across midground, floating magical cards rising towards the upper-center. Balanced composition with calm negative space for UI text.
Lighting/mood: Warm golden heroic glow, magical sparkles, team confidence, anticipation of battle.
Color palette: Cream ivory #FBFBF9, forest green #1B4332, leaf mint #52B788, pink piglet accent, warm gold #E4A83A, radiant magic violet.
Constraints: No text, no words on the cards, no letters, no UI, no aggressive sharp weapons, no watermark.
```

---

## Scene 5: 세 팀의 협동, 최종 대전 (The Final Battle: 3 Teams Unite!)
- 파일명: `assets/illustrations/intro/intro-scene-5-final-battle-cooperation.png`
- 스토리 텍스트:
  > **"마침내 드러난 비밀 보스와의 최종 대전!"**  
  > 세 팀은 경쟁자가 아니라, 함께 보스를 잠재우는 하나의 원정대입니다.  
  > 모두의 점수와 전략이 합쳐질 때, 숲에는 따뜻한 평화가 찾아오고 다음 시즌의 문이 열립니다!

### 프롬프트
```text
Use case: stylized-concept
Asset type: 16:9 widescreen storybook illustration for an elementary classroom web game
Primary request: Scene 5 of the game intro storybook for "줄넘기 원정대". Grand finale cooperative battle where 3 student teams join together to soothe a giant gentle forest boss. Do not render any text, UI, or typography.
Scene/backdrop: A grand majestic clearing deep in the ancient forest under a golden twilight canopy. In the background looms a colossal, moss-covered gentle Rock Golem awakening with glowing gentle eyes.
Subjects: In the foreground and midground, the united forces of the three expedition teams stand shoulder-to-shoulder in complete harmony. Acorn scouts, brave piglet hammers, sturdy leaf guardians, and starlight fairies channel warm golden and emerald beams of soothing, purifying light towards the gentle boss. The giant boss is smiling softly and calm, surrounded by floating blossom petals and glowing nature energy.
Style/medium: Premium 2D storybook illustration, majestic watercolor and colored-pencil on warm cream paper (#FBFBF9), epic yet heartwarming cooperation, pure classroom friendship.
Composition/framing: 16:9 widescreen epic panoramic view. United army across lower foreground, soothing giant boss in upper background. Ample readable space for text.
Lighting/mood: Glorious warm golden hour sunlight, swirling petals and soothing light beams, sense of shared triumph, heartwarming unity.
Color palette: Warm cream base #FBFBF9, royal emerald green #1B4332, golden sunlight #E4A83A, sky blue, gentle petal pink.
Constraints: No text, no letters, no violence, no gore, no defeated suffering; this is a peaceful purification through teamwork.
```
