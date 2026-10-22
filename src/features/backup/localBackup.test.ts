import { beforeEach, describe, expect, it, vi } from 'vitest';
import { economyKey } from '../economy/model';
import { practiceKey } from '../matches/practiceModel';
import {
  createPreparation,
  readPreparations,
  saveGamePreparation,
  SAVED_KEY,
} from '../preparation/model';
import { studentLinksKey } from '../student/studentBoardClient';
import {
  createLocalBackup,
  localBackupFilename,
  parseLocalBackupText,
  restoreLocalBackup,
} from './localBackup';

function plan(label = '5학년 2반 / 원정') {
  const value = createPreparation();
  value.className = label;
  value.students = [{ id: 'student-1', name: '민준' }];
  value.roster = '민준';
  value.teams[0].studentIds = ['student-1'];
  return value;
}

describe('local expedition backup', () => {
  beforeEach(() => localStorage.clear());

  it('exports a validated complete snapshot without QR secrets', () => {
    const value = plan();
    localStorage.setItem(studentLinksKey(value.id), JSON.stringify([{ token: 'secret' }]));
    localStorage.setItem(
      practiceKey(value.id),
      JSON.stringify({ version: 1, classId: value.id, draft: null, history: [] }),
    );
    const backup = createLocalBackup(value, '2026-10-22T00:00:00.000Z');
    expect(backup.snapshot.plan).toMatchObject(value);
    expect(JSON.stringify(backup)).not.toContain('secret');
    expect(localBackupFilename(value, new Date('2026-10-22T00:00:00.000Z'))).toBe(
      '줄넘기원정대_5학년 2반 원정_2026-10-22.json',
    );
  });

  it('rejects unrelated and malformed JSON files', () => {
    expect(() => parseLocalBackupText('{bad')).toThrow('JSON');
    expect(() => parseLocalBackupText('{"version":1}')).toThrow('백업 파일');
  });

  it('restores every local ledger and replaces the same expedition', () => {
    const value = plan('복원할 원정');
    const backup = createLocalBackup(value, '2026-10-20T00:00:00.000Z');
    const changed = { ...value, className: '덮어쓴 이름' };
    saveGamePreparation(changed);
    localStorage.setItem(
      economyKey(value.id),
      JSON.stringify({
        version: 1,
        expeditionId: value.id,
        purchases: [{ broken: true }],
        reversals: [],
      }),
    );
    const restored = restoreLocalBackup(backup, '2026-10-22T01:00:00.000Z');
    expect(restored[0].className).toBe('복원할 원정');
    expect(restored[0].savedAt).toBe('2026-10-22T01:00:00.000Z');
    expect(JSON.parse(localStorage.getItem(economyKey(value.id))!)).toEqual(
      backup.snapshot.economy,
    );
    expect(readPreparations()[0].className).toBe('복원할 원정');
  });

  it('rolls back all touched keys when browser storage fails', () => {
    const value = plan();
    const backup = createLocalBackup(value);
    localStorage.setItem(SAVED_KEY, '[]');
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      raw,
    ) {
      if (key === economyKey(value.id)) throw new Error('quota');
      return original.call(this, key, raw);
    });
    expect(() => restoreLocalBackup(backup)).toThrow('기존 자료는 유지');
    spy.mockRestore();
    expect(localStorage.getItem(SAVED_KEY)).toBe('[]');
    expect(localStorage.getItem(practiceKey(value.id))).toBeNull();
  });
});
