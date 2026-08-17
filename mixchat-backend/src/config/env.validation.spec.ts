import { envValidationSchema, EnvironmentVariables } from './env.validation';

describe('envValidationSchema', () => {
  it('should validate a valid configuration with defaults', () => {
    const validEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      REDIS_URL: 'redis://localhost:6379',
    };

    const result = envValidationSchema.validate(validEnv);
    expect(result.error).toBeUndefined();
    const value = result.value as EnvironmentVariables;
    expect(value.PORT).toBe(4000);
    expect(value.API_PREFIX).toBe('api');
    expect(value.NODE_ENV).toBe('development');
  });

  it('should fail fast when DATABASE_URL is missing', () => {
    const invalidEnv = {
      REDIS_URL: 'redis://localhost:6379',
    };

    const result = envValidationSchema.validate(invalidEnv);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('DATABASE_URL is required');
  });

  it('should fail fast when REDIS_URL is missing', () => {
    const invalidEnv = {
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    };

    const result = envValidationSchema.validate(invalidEnv);
    expect(result.error).toBeDefined();
    expect(result.error?.message).toContain('REDIS_URL is required');
  });
});
