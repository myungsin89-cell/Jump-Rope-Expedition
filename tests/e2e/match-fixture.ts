import type { Page } from '@playwright/test';

export async function seedMatchClass(page: Page) {
  const id = 'record-board-class';
  await page.goto('/#/prepare');
  await page.getByRole('heading', { name: '새 원정을 만들어요' }).waitFor();
  await page.evaluate((classId) => {
    const students = Array.from({ length: 6 }, (_, index) => ({
      id: `s-${index + 1}`,
      name: `가상학생 ${index + 1}`,
    }));
    const plan = {
      id: classId,
      className: '5학년 2반',
      roster: students.map((student) => student.name).join('\n'),
      students,
      teams: ['초록 원정대', '햇살 원정대', '바람 원정대'].map((name, index) => ({
        name,
        studentIds: [students[index].id, students[index + 3].id],
      })),
      seasonCount: 1,
      seasons: Array.from({ length: 5 }, () => ({
        bossId: 'BOSS_01',
        startDate: '2026-10-19',
        endDate: '2026-11-10',
      })),
      teamsConfirmed: true,
      seasonsConfirmed: true,
      savedAt: '2026-10-19T00:00:00Z',
    };
    localStorage.setItem('jre.preparations.v2', JSON.stringify([plan]));
  }, id);
  await page.goto(`/#/preparations/${id}`);
  await page.getByRole('navigation', { name: '원정 메뉴' }).waitFor();
  return id;
}
