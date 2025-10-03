import apiRouter from '../api';

describe('API Router', () => {
  it('should export an Express Router instance', () => {
    expect(apiRouter).toBeDefined();
    expect(typeof apiRouter).toBe('function');
    // Router is a function with special properties
    expect(apiRouter.name).toBe('router');
  });

  it('should be a valid Express Router', () => {
    // Check that it has the expected Router methods
    expect(typeof apiRouter.use).toBe('function');
    expect(typeof apiRouter.get).toBe('function');
    expect(typeof apiRouter.post).toBe('function');
    expect(typeof apiRouter.put).toBe('function');
    expect(typeof apiRouter.delete).toBe('function');
  });
});
