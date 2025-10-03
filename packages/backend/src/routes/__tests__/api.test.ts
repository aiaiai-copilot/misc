import apiRouter from '../api.js';

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

  it('should have registered routes', () => {
    // Access the router's stack to verify routes are registered
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stack = (apiRouter as any).stack;
    expect(stack).toBeDefined();
    expect(Array.isArray(stack)).toBe(true);
    expect(stack.length).toBeGreaterThan(0);

    // Verify specific routes exist
    const routes = stack.map((layer: any) => ({
      path: layer.route?.path,
      methods: layer.route ? Object.keys(layer.route.methods) : []
    })).filter((r: any) => r.path);

    // Check for expected endpoints
    const paths = routes.map((r: any) => r.path);
    expect(paths).toContain('/records');
    expect(paths).toContain('/records/:id');
    expect(paths).toContain('/tags');
  });
});
