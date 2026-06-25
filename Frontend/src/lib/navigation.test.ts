import { Role, navigation, filterNavigationByRole } from './navigation';

describe('filterNavigationByRole', () => {
  it('returns all shared links for USER', () => {
    const result = filterNavigationByRole(navigation, Role.USER);
    const hrefs = result.map((item) => item.href);

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/dashboard/documents');
    expect(hrefs).toContain('/dashboard/environmental');
    expect(hrefs).not.toContain('/dashboard/quality');
    expect(hrefs).not.toContain('/dashboard/education');
    expect(hrefs).not.toContain('/dashboard/indicators');
  });

  it('returns management links for MANAGER', () => {
    const result = filterNavigationByRole(navigation, Role.MANAGER);
    const hrefs = result.map((item) => item.href);

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/dashboard/quality');
    expect(hrefs).toContain('/dashboard/education');
    expect(hrefs).toContain('/dashboard/indicators');
  });

  it('returns read-only links for AUDITOR', () => {
    const result = filterNavigationByRole(navigation, Role.AUDITOR);
    const hrefs = result.map((item) => item.href);

    expect(hrefs).toContain('/dashboard');
    expect(hrefs).toContain('/dashboard/documents');
    expect(hrefs).toContain('/dashboard/environmental');
    expect(hrefs).toContain('/dashboard/quality');
    expect(hrefs).toContain('/dashboard/education');
    expect(hrefs).toContain('/dashboard/indicators');
  });

  it('returns empty array when role is missing', () => {
    const result = filterNavigationByRole(navigation, undefined);
    expect(result).toEqual([]);
  });
});
