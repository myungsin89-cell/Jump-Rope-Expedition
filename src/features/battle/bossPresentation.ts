import rockVideo from '../../../assets/boss/web/Rock_golem_boss_entrance_video_20261023160851.mp4';
import windVideo from '../../../assets/boss/web/Wind_wyvern_boss_entrance_video_20261023161115.mp4';
import treantVideo from '../../../assets/boss/web/Treant_boss_entrance_video_creation_20261023161359.mp4';
import iceVideo from '../../../assets/boss/web/Ice_yeti_boss_entrance_video_20261023162515.mp4';
import dragonVideo from '../../../assets/boss/web/Dragon_entering_volcanic_crater_1080p_20261023162319.mp4';

export type BossAttackKind = 'rock' | 'wind' | 'vine' | 'ice' | 'fire';

interface BossPresentation {
  introVideo: string;
  attackKind: BossAttackKind;
  attackLabel: string;
}

// Presentation only: damage, defense type and rankings come from the frozen battle.
export const BOSS_PRESENTATIONS: Record<string, BossPresentation | undefined> = {
  BOSS_01: { introVideo: rockVideo, attackKind: 'rock', attackLabel: '바위 투척!' },
  BOSS_02: { introVideo: windVideo, attackKind: 'wind', attackLabel: '회오리 돌풍!' },
  BOSS_03: { introVideo: treantVideo, attackKind: 'vine', attackLabel: '가시 덩굴!' },
  BOSS_04: { introVideo: iceVideo, attackKind: 'ice', attackLabel: '얼음 파편!' },
  BOSS_05: { introVideo: dragonVideo, attackKind: 'fire', attackLabel: '용의 화염!' },
};
