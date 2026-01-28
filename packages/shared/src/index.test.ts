import { PACKAGE_NAME } from './index.js';

describe('shared package', () => {
  it('exports the package name', () => {
    expect(PACKAGE_NAME).toBe('@mockingboard/shared');
  });
});
