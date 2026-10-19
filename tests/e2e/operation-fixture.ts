import type { Page } from '@playwright/test';

export async function seedOperation(page: Page, count = 30, configured = true) {
  const id = 'operation-sample';
  await page.goto('/#/prepare');
  await page.getByRole('heading', { name: '새 원정을 만들어요' }).waitFor();
  await page.evaluate(
    ({ id, count, configured }) => {
      const students = Array.from({ length: count }, (_, index) => ({
        id: `s-${index + 1}`,
        name: `가상학생 ${index + 1}`,
      }));
      const teams = ['초록 원정대', '햇살 원정대', '바람 원정대'].map((name, index) => ({
        name,
        studentIds: students
          .filter((_, at) => at % 3 === index)
          .map((student) => student.id),
        captainId: students[index].id,
      }));
      const plan = {
        id,
        className: '우리의 숲속 원정',
        roster: students.map((student) => student.name).join('\n'),
        students,
        teams,
        seasonCount: 1,
        seasons: Array.from({ length: 5 }, (_, index) => ({
          bossId: index === 0 ? 'BOSS_01' : '',
          startDate: index === 0 ? '2026-10-20' : '',
          endDate: index === 0 ? '2026-11-20' : '',
        })),
        jumpers: teams.map((team) =>
          configured ? [{ studentId: team.studentIds[0], multiplier: 2 }] : [],
        ),
        teamsConfirmed: false,
        seasonsConfirmed: false,
        savedAt: '2026-10-20T00:00:00Z',
      };
      localStorage.setItem('jre.preparations.v2', JSON.stringify([plan]));
    },
    { id, count, configured },
  );
  await page.goto(`/#/preparations/${id}`);
  await page.getByRole('navigation', { name: '원정 메뉴' }).waitFor();
  return id;
}
