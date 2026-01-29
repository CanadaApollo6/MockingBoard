import { teams } from './index.js';

describe('shared package exports', () => {
  it('exports team seed data', () => {
    expect(teams).toHaveLength(32);
  });
});
