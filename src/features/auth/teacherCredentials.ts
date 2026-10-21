const teacherEmailDomain = 'teachers.jump-rope-expedition.app';
const teacherIdPattern = /^[a-z0-9]{4,20}$/;

type TeacherIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export function normalizeTeacherId(value: string) {
  return value.trim().toLowerCase();
}

export function getTeacherIdError(value: string) {
  const teacherId = normalizeTeacherId(value);
  if (!teacherId) return '아이디를 입력해 주세요.';
  if (!teacherIdPattern.test(teacherId))
    return '아이디는 영문 소문자와 숫자 4~20자로 만들어 주세요.';
  return '';
}

export function getPasswordError(value: string) {
  if (!value) return '비밀번호를 입력해 주세요.';
  if (value.length < 6) return '비밀번호는 6자 이상 입력해 주세요.';
  if (value.length > 72) return '비밀번호는 72자 이하로 입력해 주세요.';
  return '';
}

export function teacherIdToEmail(value: string) {
  return `${normalizeTeacherId(value)}@${teacherEmailDomain}`;
}

export function getTeacherDisplayId(user: TeacherIdentity) {
  const metadataId = user.user_metadata?.teacher_id;
  if (typeof metadataId === 'string' && metadataId) return metadataId;

  const email = user.email?.toLowerCase() ?? '';
  const suffix = `@${teacherEmailDomain}`;
  if (email.endsWith(suffix)) return email.slice(0, -suffix.length);
  return '교사 계정';
}
