import { describe, expect, it } from 'vitest';

import {
  getPasswordError,
  getTeacherDisplayId,
  getTeacherIdError,
  normalizeTeacherId,
  teacherIdToEmail,
} from './teacherCredentials';

describe('teacher credentials', () => {
  it('normalizes an ID and converts it to the internal Supabase address', () => {
    expect(normalizeTeacherId('  Forest01 ')).toBe('forest01');
    expect(teacherIdToEmail('Forest01')).toBe(
      'forest01@teachers.jump-rope-expedition.app',
    );
  });

  it('accepts only 4 to 20 lowercase letters and numbers', () => {
    expect(getTeacherIdError('rope7')).toBe('');
    expect(getTeacherIdError('abc')).toContain('4~20자');
    expect(getTeacherIdError('선생님1')).toContain('영문 소문자와 숫자');
    expect(getTeacherIdError('teacher_name')).toContain('영문 소문자와 숫자');
  });

  it('allows a numeric password with at least 6 characters', () => {
    expect(getPasswordError('123456')).toBe('');
    expect(getPasswordError('12345')).toContain('6자 이상');
  });

  it('shows metadata ID and can fall back to the internal address', () => {
    expect(
      getTeacherDisplayId({
        email: 'other@example.com',
        user_metadata: { teacher_id: 'forest01' },
      }),
    ).toBe('forest01');
    expect(
      getTeacherDisplayId({
        email: 'rope7@teachers.jump-rope-expedition.app',
        user_metadata: {},
      }),
    ).toBe('rope7');
  });
});
