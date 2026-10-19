# 줄넘기 원정대 영웅 마스터 일러스트 프롬프트 v1

## 제작 방식

- 생성 도구: Codex 내장 `imagegen`
- 출력: 카드 프레임과 전투 컷인에 함께 쓰는 단일 캐릭터 투명 PNG
- 스타일 참조: `title-screen-cover-v1.png`와 기존 병력 일러스트
- 카드명·등급·효과 문구·프레임은 이미지에 넣지 않고 UI에서 합성

## 전체 공통 프롬프트

> Create a production-ready full-body 2D hero master cutout for a Korean elementary classroom forest-fantasy web game, reusable in hero cards and battle cut-ins. Match the attached references only for visual style: organic hand-drawn linework, watercolor and colored-pencil texture, warm premium storybook game art, 2.5–3.5 head proportions, charming but not babyish. Exactly one hero, full body, centered, front-facing three-quarter heroic pose, distinct readable silhouette, comfortable transparent padding, nothing cropped. Genuinely transparent background. No scenery, ground plane, pedestal, frame, card border, text, letters, numbers, logo, watermark, extra characters, duplicate limbs, blood, horror, photorealism, pixel art, 3D render, or anime screenshot. The reference characters must not appear in the output.

## 등급 표현

- 일반: practical materials, warm forest green and amber palette, modest restrained magic.
- 희귀: refined layered costume, richer craftsmanship, blue-violet and restrained gold magical accents, more dynamic silhouette and magic than common heroes.
- 전설: richest handcrafted detail, celestial gold and starlight accents, regal but classroom-friendly, clearly more majestic than common and rare heroes.

## 일반 영웅 8명

### H01 로빈

> A nimble robin-bird-themed forest archer and scout, youthful and clever, russet-red breast accents, leaf hood, compact wooden bow, acorn-shaped quiver clasp. Visual role: increases Acorn Explorer attack. Alert scout stance, drawing a tiny glowing leaf-arrow, confident friendly expression.

### H02 골리앗

> A large friendly bear forest hammer champion and woodsmith, powerful but gentle, broad leather apron armor, mossy shoulder pad, enormous handcrafted wooden mallet with acorn metal caps. Visual role: increases Forest Hammer unit attack. Mallet resting over one shoulder, sturdy heroic stance, warm determined grin.

### H03 실피드

> A graceful small wind-fairy spirit mage, pale mint and sky-blue layered leaf robes, translucent dragonfly-like wings, airy ribbon curls, star-shaped wand and a delicate protective magic veil. Visual role: increases Starlight Fairy magic defense contribution. Floating slightly with one hand casting a soft spiral shield, calm kind expression.

### H04 포포

> An energetic red-panda forest drummer and banner bearer, compact adventurer vest, leaf-pattern headband, small round marching drum and short flag with a simple abstract sunburst symbol only. Visual role: boosts the whole team's basic attack. One foot forward striking the drum as warm pulse rings and a few leaf motes suggest rallying energy, cheerful brave expression.

### H05 클로버

> A small clover-themed knight and defender, gender-neutral childlike adventurer, layered leaf armor, four-leaf-clover brooch, and a broad rounded wooden shield shaped subtly like overlapping leaves. Visual role: increases Leaf Guardian physical defense contribution. Shield planted forward in a protective stance, friendly determined face, a few small green shield motes.

### H06 브루노

> A sturdy brown-bear shield captain, mature and dependable, patched forest brigandine, wide belt, reinforced wooden tower shield with bronze leaf fittings, short baton at hip. Visual role: boosts the whole team's physical defense. Wide grounded stance with shield raised to cover allies, calm reassuring smile, modest amber guard glow.

### H07 루나

> A wise moonlit owl mage and magical ward keeper, soft cream and dusk-blue feathers, sage-green mantle, crescent staff, tiny star charms and a round translucent moon ward. Visual role: boosts the whole team's magic defense. Wings and robe contained in a readable silhouette, staff raised while a pale blue ward forms, serene watchful expression.

### H08 제피

> A swift wind-messenger fox, lean and agile, green courier jacket, leaf-shaped goggles resting on forehead, small satchel, light boots and a short flowing scarf. Visual role: extends the team's action-available time. Dynamic running-start stance with one foot lifted, scarf and a restrained spiral of wind suggesting speed, bright focused grin.

## 희귀 영웅 5명

### H09 아르코

> A master forest attack commander with elegant stag-antler motifs, agile human ranger, deep green and navy layered coat, ornate longbow that also carries subtle hammer-head geometry at the grip, bronze command brooch. Visual role: boosts both attack unit types. Sweeping forward command gesture while holding the bow, two restrained amber-blue attack trails crossing behind the silhouette, bold encouraging expression.

### H10 노아

> A clever dual-defense architect and guardian, anthropomorphic beaver with refined navy-green field coat, tool belt, fold-out wooden shield apparatus combining one broad leaf plate and one translucent star-magic plate. Visual role: boosts both defensive unit types. Braced behind the two-part barrier while adjusting a glowing mechanism, thoughtful confident expression, blue and green ward sparks.

### H11 벨라

> An elegant rose-themed battle mage, young human adventurer, burgundy, forest green and ivory layered traveling dress-armor, slim vine rapier and a small mirrored magic buckler. Visual role: boosts all attack and the matching defense. Graceful decisive lunge with the rapier, one amber attack arc mirrored by one blue protective arc, poised courageous smile; no glamorous adult styling.

### H12 쿼드

> A friendly ancient four-aspect forest guardian construct, one compact humanoid hero made of pale wood and smooth stone, expressive glowing eyes, normal two arms and two legs only. Four distinct floating emblems orbit close to the body: acorn-arrow, wooden hammer, leaf shield, starlight ward. Visual role: when all four unit types are present, boosts every contribution. Centered powerful stance, hands guiding the four balanced emblems, refined blue-green-gold magic, wise benevolent presence.

### H13 루미

> A radiant young challenge hero who represents steady growth, gender-neutral child adventurer, luminous ivory and teal training outfit with leaf motifs, holding a real jump rope with two handles. The rope forms one clean glowing loop around the hero without tangling limbs. Visual role: converts the current season's best challenge bonus count into hero attack. Landing confidently after a jump, one knee slightly bent, rope arc glowing brighter in five small sequential leaf sparks to imply repeated growth, proud encouraging smile. Keep all anatomy clear and exactly two arms and two legs.

## 전설 영웅 2명

### H14 아스트라

> A celestial winged forest guardian embodying attack, physical guard, and magic guard together. Noble and androgynous young adult-like storybook hero, layered ivory, deep forest green and midnight-blue armor-robes, luminous feathered wings, three symbolic relics integrated into one design: a slender star spear, a small leaf-shaped shoulder shield, and a translucent moon ward hovering near the free hand. Commanding upright flight stance, wings spread within canvas, gold-blue starlight halo fragments behind but no circular frame, compassionate determined expression.

### H15 레온

> A regal anthropomorphic lion hero who turns defense into offense, warm golden mane, forest-green royal mantle, ornate leaf-and-star plate armor, one massive protective shield and one bright energy sword grown from the same shield's golden light. Visual role: a stronger guard becomes extra attack without being consumed. Shield planted protectively while the shield light flows visibly into the raised sword, powerful balanced stance, brave kind expression, crown-like leaf circlet rather than a metal crown.

## 파일 규칙

- `hero-h01-robin-common-v1.png`부터 `hero-h15-leon-legendary-v1.png`까지 사용
- 효과 수치와 한국어 이름은 앱 데이터에서 관리
- 카드 프레임과 획득 애니메이션은 등급별 UI 에셋으로 별도 제작
