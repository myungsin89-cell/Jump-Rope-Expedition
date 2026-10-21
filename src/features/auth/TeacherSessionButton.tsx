import { useState } from 'react';

import { useAuth } from './AuthContext';

export default function TeacherSessionButton() {
  const { user, signOut } = useAuth();
  const [working, setWorking] = useState(false);

  if (!user) return null;

  return (
    <div className="teacher-session">
      <span title={user.email}>{user.email}</span>
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
