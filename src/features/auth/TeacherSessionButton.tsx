import { useState } from 'react';

import { useAuth } from './AuthContext';
import { getTeacherDisplayId } from './teacherCredentials';

export default function TeacherSessionButton() {
  const { user, signOut } = useAuth();
  const [working, setWorking] = useState(false);

  if (!user) return null;
  const teacherId = getTeacherDisplayId(user);

  return (
    <div className="teacher-session">
      <span title={`아이디: ${teacherId}`}>{teacherId}</span>
      <button
        disabled={working}
        onClick={() => {
          setWorking(true);
          void signOut().finally(() => setWorking(false));
        }}
        type="button"
      >
        {working ? '로그아웃 중…' : '로그아웃'}
      </button>
    </div>
  );
}
