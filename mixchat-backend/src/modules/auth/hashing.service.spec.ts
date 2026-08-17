import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(() => {
    service = new HashingService();
  });

  it('should hash password with Argon2id and verify correctly', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await service.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).toContain('$argon2id$');
    expect(hash).not.toBe(password);

    const isValid = await service.verifyPassword(hash, password);
    expect(isValid).toBe(true);

    const isInvalid = await service.verifyPassword(hash, 'WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('should generate opaque random tokens and hash with SHA-256', () => {
    const token1 = service.generateOpaqueToken();
    const token2 = service.generateOpaqueToken();

    expect(token1).toHaveLength(64); // 32 bytes hex
    expect(token2).toHaveLength(64);
    expect(token1).not.toBe(token2);

    const hash1 = service.hashToken(token1);
    const hash2 = service.hashToken(token1);
    const hash3 = service.hashToken(token2);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64);
  });
});
