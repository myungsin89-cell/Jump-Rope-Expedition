# 줄넘기 원정대 오디오 전체 제작 완료 보고서 (Audio Production Notes)

- 작성일: 2026-10-19
- 상태: **전체 5단계 오디오 제작 100% 완료 (BGM 2종, 스팅어 5종, 효과음 33종, 총 40개 사운드 파일)**

---

## 1. 프로젝트 총괄 현황

지시서(`docs/audio-agent-production-brief.md`)에 정의된 모든 오디오 에셋(인트로 BGM, 출발음, 공통 UI 효과음, 준비/구매 효과음, 영웅 카드 공개 스팅어 및 효과음, 최종 대전 전투 BGM, 보스/결과 스팅어 4종, 전투 효과음 15종)이 **100% 자체 DSP 물리 모델링 음향 합성**을 통해 완성되었습니다.

- **외부 샘플 사용 여부:** 0% (100% 자체 프로그래밍 합성으로 상용 및 수업 환경에서 영구히 저작권 문제 없음)
- **샘플링 규격:** 48,000 Hz, 16-bit / 24-bit Stereo PCM WAV
- **마스터링 기준:** 전 파일 최대 피크 -1.0 dBTP 제한 (디지털 클리핑 0%)
- **루프 무결성:** `BGM-01` 및 `BGM-02` 모두 끝 부분 잔향을 0.0초 헤드로 랩어라운드 믹싱하여 **완전 무한 반복(Seamless Loop)** 보장

---

## 2. 제작 완료 에셋 전체 인벤토리 (총 40종)

### 🌲 배경음악 (BGM - 2종)

1. **[BGM-01]** `bgm/bgm_title_forest_departure_loop.wav` (60.00초 / G Major / BPM 104 / 표지 대기 화면 무한 루프)
2. **[BGM-02]** `bgm/bgm_final_battle_main_loop.wav` (50.91초 / D Minor / BPM 132 / 최종 대전 전투 본곡 무한 루프)

### 🎺 전환 및 결과 스팅어 (Stingers - 5종)

3. **[ST-01]** `stingers/st_title_start.wav` (2.20초 / 표지 시작 버튼 클릭 시 경쾌한 원정 출발음)
4. **[ST-02]** `stingers/st_boss_reveal.wav` (3.80초 / 최종 대전 비밀 보스 첫 등장 웅장한 각성 팡파르)
5. **[ST-03]** `stingers/st_class_finish.wav` (5.50초 / 3팀 힘 결집 ➔ 협동 마무리 일격 및 승리 링아웃)
6. **[ST-04]** `stingers/st_boss_defeat.wav` (3.80초 / 보스가 숲의 정령으로 정화되며 평화롭게 잠드는 종소리)
7. **[ST-05]** `stingers/st_result_reveal.wav` (6.20초 / 최종 피해량 및 순위·승점 공개 합동 축하 팡파르)

### 🔘 공통 UI (8종)

8. **[UI-01]** `sfx/ui/sfx_ui_tap.wav` (0.14초 / 일반 버튼 선택 우드블록 탭)
9. **[UI-02]** `sfx/ui/sfx_ui_confirm.wav` (0.55초 / 저장·확정 성공 상향 칼림바 딩동)
10. **[UI-03]** `sfx/ui/sfx_ui_cancel.wav` (0.38초 / 취소·닫기 부드러운 하향 마림바)
11. **[UI-04]** `sfx/ui/sfx_ui_warning.wav` (0.70초 / 확인 주의 안내 템플 블록 & 목관 5도)
12. **[UI-05]** `sfx/ui/sfx_ui_error_soft.wav` (0.48초 / 입력 오류 더블 우드 둔탁음)
13. **[UI-06]** `sfx/ui/sfx_ui_points_gain.wav` (0.90초 / 팀 포인트 획득 도토리 벨 & 글로켄슈필)
14. **[UI-07]** `sfx/ui/sfx_ui_rank_reveal.wav` (2.80초 / 경기 순위 공개 말렛 롤 & 호른 팡파르)
15. **[UI-08]** `sfx/ui/sfx_ui_medal_award.wav` (2.50초 / 메달 수여 하프 아르페지오 & 황금 대성당 차임)

### 🛒 구매와 준비 (3종)

16. **[PR-01]** `sfx/preparation/sfx_unit_purchase.wav` (1.00초 / 병력 구매 및 배치 안착음)
17. **[PR-02]** `sfx/preparation/sfx_hint_purchase.wav` (1.10초 / 보스 힌트 구매 코인 찰랑 & 지도 두루마리 펼침)
18. **[PR-03]** `sfx/preparation/sfx_hint_reveal.wav` (1.60초 / 비밀 힌트 열람 신비 패드 스웰 & 훈풍 차임)

### 🃏 영웅 카드 공개 (7종 - 공통 멜로디 테마 통일)

19. **[HR-01]** `sfx/hero/sfx_hero_card_shake.wav` (0.90초 / 봉인 카드 흔들림 진동음)
20. **[HR-02]** `sfx/hero/sfx_hero_card_glow.wav` (1.45초 / 마법 입자 상승 스윕 & 별빛 벨)
21. **[HR-03]** `sfx/hero/sfx_hero_card_flip.wav` (0.60초 / 카드 뒤집기 날렵한 휙 & 단단한 스냅)
22. **[HR-04]** `sfx/hero/st_hero_common_reveal.wav` (2.40초 / 일반: 공통 테마 멜로디 + 나뭇잎 흩날림 & 우드블록)
23. **[HR-05]** `sfx/hero/st_hero_rare_reveal.wav` (2.80초 / 희귀: 공통 테마 멜로디 + 푸른 마법 펄스 & 옥타브 칼림바)
24. **[HR-06]** `sfx/hero/st_hero_legendary_reveal.wav` (3.60초 / 전설: 공통 테마 멜로디 + 지면 서브 임팩트 & 금빛 브라스)
25. **[HR-07]** `sfx/hero/sfx_hero_added.wav` (1.00초 / 도감/보관함 안착 우든 인장 쿵 & 록 차임)

### 🛡️ 전투 핵심 효과음 (15종)

26. **[BT-01]** `sfx/battle/sfx_unit_enter.wav` (0.75초 / 병력 전장 진입 발걸음)
27. **[BT-02]** `sfx/battle/sfx_acorn_ranged_attack.wav` (0.65초 / 도토리 탐험가 원거리 투석 공격)
28. **[BT-03]** `sfx/battle/sfx_hammer_melee_attack.wav` (0.65초 / 숲속 해머단 근거리 해머 강타)
29. **[BT-04]** `sfx/battle/sfx_leaf_guard_raise.wav` (0.75초 / 잎사귀 수호자 거대 방패 전개)
30. **[BT-05]** `sfx/battle/sfx_leaf_guard_hit.wav` (0.55초 / 물리 공격 잎사귀/나무 방어)
31. **[BT-06]** `sfx/battle/sfx_star_barrier_cast.wav` (0.95초 / 별빛 요정 마법 장벽 생성)
32. **[BT-07]** `sfx/battle/sfx_star_barrier_hit.wav` (0.60초 / 마법 공격 수정 장벽 팅- 튕김 방어)
33. **[BT-08]** `sfx/battle/sfx_boss_physical_telegraph.wav` (1.10초 / 보스 물리 공격 지면 진동 예고)
34. **[BT-09]** `sfx/battle/sfx_boss_magic_telegraph.wav` (1.10초 / 보스 마법 공격 자연 마력 모임 예고)
35. **[BT-10]** `sfx/battle/sfx_boss_physical_attack.wav` (1.20초 / 보스 거대 바위/나무줄기 물리 공격)
36. **[BT-11]** `sfx/battle/sfx_boss_magic_attack.wav` (1.20초 / 보스 바람/자연 마법 방출 공격)
37. **[BT-12]** `sfx/battle/sfx_boss_hit.wav` (0.45초 / 보스 피격 통쾌한 타격음)
38. **[BT-13]** `sfx/battle/sfx_boss_stagger.wav` (1.10초 / 보스 비틀거림 및 삐걱임)
39. **[BT-14]** `sfx/battle/sfx_hero_cutin.wav` (1.00초 / 영웅 컷인 시간 정지 & 심장 박동 임팩트)
40. **[BT-15]** `sfx/battle/sfx_hero_ultimate.wav` (2.00초 / 영웅 궁극기 도약 상승 & 마법 대폭발)

_(무손실 원본 마스터 40종 모두 `assets/audio/masters/`에 영구 보존 완료)_

---

## 3. 웹 검토 플레이어 링크

- **표지 및 출발 검토 플레이어:** [assets/audio/player.html](file:///c:/Users/소미네/Desktop/줄넘기원정대/assets/audio/player.html)
- **1차 효과음 및 영웅 뽑기 시뮬레이터:** [assets/audio/sfx-player.html](file:///c:/Users/소미네/Desktop/줄넘기원정대/assets/audio/sfx-player.html)
- **최종 대전(전투) 전체 시퀀스 플레이어:** [assets/audio/battle-player.html](file:///c:/Users/소미네/Desktop/줄넘기원정대/assets/audio/battle-player.html)
