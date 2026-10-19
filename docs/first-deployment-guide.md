# 내일 사용을 위한 첫 배포 안내

## 이번 범위

교사가 명단과 팀 구성을 만들고 학생이 자기 원정대 명단·병력·영웅 카드를 읽기 전용으로 보는 단계다. 구매·공식 포인트·영웅 획득·최종 대전은 아직 구현 완료가 아니다.

GitHub·Vercel은 앱 화면을 배포한다. **명단을 다른 기기에 전달하는 저장 서버는 Supabase를 따로 연결해야 한다.** 서버 연결 전 `학생 화면 미리보기`는 같은 브라우저에서만 동작한다.

## 1. GitHub → Vercel

- 저장소: `myungsin89-cell/Jump-Rope-Expedition`
- Vercel에서 저장소를 가져오고 Framework Preset을 Vite로 선택한다.
- Root Directory: 저장소 루트. Build Command: `npm run build`. Output Directory: `dist`.
- 아직 서버가 없어도 화면 배포는 된다. 학생 공유는 2~4단계 이후에 확인한다.
- Vercel에 표시된 실제 운영 주소를 기록한다. Preview 주소와 운영 주소는 다르므로 학생에게는 운영 주소를 쓴다.

## 2. Supabase 프로젝트와 테이블

1. Supabase에서 프로젝트를 만들고 프로젝트 ID와 Functions 주소를 확인한다.
2. SQL Editor에서 `supabase/migrations/202610200001_student_boards.sql`을 실행한다. 또는 연결된 프로젝트에 CLI의 `supabase db push`를 사용한다. 둘 중 하나로 적용하고 중복 실행하지 않는다.
3. 이 테이블은 익명/일반 클라이언트의 직접 조회·쓰기를 차단한다. 권한을 열어 오류를 우회하지 않는다.

원정 준비 원본과 학생용 공개 스냅샷은 분리되어 있다. 공개 스냅샷에는 자기 원정대 이름·이름 명단·대장/도전점퍼 여부·시즌 번호만 포함한다. 보스·학생 ID·다른 팀 명단·개인 배수는 없다.

## 3. 게시 서버 배포

정식 로그인 대신 이 교사만 사용하는 임시 게시 키를 둔다. 비밀번호 관리 도구에서 32자 이상 충분히 무작위인 키를 생성하고 개인적으로 보관한다. 채팅·GitHub·학생 안내에 키를 쓰지 않는다.

Supabase의 Edge Functions Secrets에 다음을 설정한다.

| 이름                  | 값                                                                             |
| --------------------- | ------------------------------------------------------------------------------ |
| `CLASSROOM_OWNER_KEY` | 위에서 만든 비공개 게시 키, 최소 32자                                          |
| `ALLOWED_ORIGINS`     | 실제 Vercel 운영 origin, 예: `https://앱이름.vercel.app` (경로·끝 슬래시 없음) |

여러 origin이 필요하면 쉼표로 구분한다. 로컬 테스트를 허용하려면 `http://127.0.0.1:4173` 등을 명시적으로 추가한다. `*`는 쓰지 않는다.

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 호스팅 함수의 서버 환경에만 둔다. service-role 키를 Vercel의 `VITE_` 변수나 앱 코드에 복사하지 않는다.

프로젝트 루트에서 Supabase CLI로 진행한다.

```powershell
npx supabase login
npx supabase link --project-ref 프로젝트ID
npx supabase functions deploy student-board --no-verify-jwt
```

함수는 공개 GET을 허용하고 쓰기는 자체 게시 키로 검증한다. `verify_jwt=false`만 설정하고 인증 없는 쓰기를 허용하는 함수로 바꾸면 안 된다. 배포 후 함수 URL은 보통 `https://프로젝트ID.supabase.co/functions/v1/student-board`다. 실제 콘솔 주소를 사용한다.

## 4. Vercel 환경 변수 → 재배포

Vercel 프로젝트의 Environment Variables에 공개 주소 두 개만 설정한다.

| 이름                  | 값                                       |
| --------------------- | ---------------------------------------- |
| `VITE_BOARD_API_URL`  | 배포된 student-board 함수 전체 HTTPS URL |
| `VITE_PUBLIC_APP_URL` | Vercel 운영 앱 주소                      |

Vite 변수는 빌드에 들어가므로 변경 후 새 배포가 필요하다. **게시 키와 service-role 키는 여기 넣지 않는다.** 로컬에서도 사용하려면 같은 공개 주소를 `.env.local`에 넣고 개발 서버를 재시작한다. `.env.local`은 커밋하지 않는다.

## 5. 실제 수업 전 점검

1. 교사 PC에서 원정과 30명 안팎의 명단을 만들고 원정대 이름·대장·구성을 저장한다.
2. 현황 → `학생 화면 공유` → 개인 게시 키 입력 → `현재 명단 게시`.
3. 원정대별 QR이 생겼는지 확인하고 해당 학생들에게만 전달한다. 게시 키는 전달하지 않는다.
4. **교사 PC와 다른 휴대기기/시크릿 창**에서 QR을 열어 정확한 팀과 명단이 나오는지 본다.
5. 병력 4종·영웅 15종 이미지, 수정/구매 기능 없음, 다른 팀 구성/보스/배수 숨김을 확인한다.
6. 교사가 명단을 바꾼 뒤 재게시하고, 학생의 `명단 새로고침`에서 바뀐 내용이 보이는지 확인한다.
7. QR이 외부로 유출되면 `QR 재발급` 후 새 QR을 전달하고 이전 QR은 열리지 않는지 확인한다.

링크를 아는 사람은 이름 명단을 읽을 수 있다. 교실 내 공유용이며 학생별 로그인은 아니다. 인터넷 게시판 등에 QR을 공개하지 않는다. Vercel의 검색 차단 헤더는 접근 제어를 대신하지 않는다.

## 저장 범위와 주의

- 교사 운영 원본: 현재 브라우저의 로컬 저장소. 다른 PC에서 자동으로 교사 원정 목록이 복원되지는 않는다.
- 게시 시 비공개 서버 백업: 해당 원정의 준비 명단·팀·시즌 설정. API에 키로 보호된 조회가 있지만 복원 UI는 아직 없다.
- 학생 화면: 마지막으로 게시한 서버 명단 스냅샷. 교사가 매번 편성할 때 자동으로 실시간 갱신되는 구조가 아니다.
- 연습 경기·훈장: 현재 브라우저에만 있다. 이번 게시 백업 대상이 아니므로 원본 브라우저 데이터를 삭제하지 않는다.
- 게시 키는 입력 중 메모리에만 있고 저장하지 않는다. 닫았다 다시 게시할 때 재입력한다.
- 동시 다중 교사/학생 쓰기, 공식 보상 장부, 정식 인증·접근 감사는 후속 제품화 범위다.

## 현재 확인 상태

- 로컬 타입 검사·배포 빌드, 단위/API 경계 테스트 83개, 브라우저 테스트 26개 통과.
- 실제 배포 번들을 별도 로컬 서버로 열어 카드 19종 이미지와 주아 글꼴 로딩을 확인했다. QR 생성·게시/재발급 요청·별도 브라우저의 공개 읽기·명단 새로고침은 모의 API로 검증했다. 이것을 실제 Supabase 연결 완료로 해석하면 안 된다.
- 전체 ESLint에는 기존 인트로 컴포넌트의 React Hooks 오류 6개가 남아 있다. 이번 학생 공유 관련 파일은 별도 검사한다.
- SQL과 Edge Function은 배포용 소스가 준비된 상태다. 실제 Supabase 프로젝트에서 마이그레이션·배포·권한 및 기기 간 테스트는 **아직 실행하지 않았다**. 로컬 Docker 엔진이 실행 중이 아니므로 로컬 DB 실행 검증도 남아 있다.
- GitHub 업로드와 Vercel 배포 성공 여부는 작업 완료 메시지 및 실제 서비스 화면에서 따로 확인한다.

공식 참고: [Vercel의 Vite 배포](https://vercel.com/docs/frameworks/frontend/vite), [Supabase 함수 구성](https://supabase.com/docs/guides/functions/function-configuration), [DB 함수와 실행 권한](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
