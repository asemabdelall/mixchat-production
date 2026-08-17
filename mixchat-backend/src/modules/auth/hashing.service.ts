import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class HashingService {
  /**
   * Hash password using Argon2id with OWASP-recommended safe parameters
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB
      timeCost: 2,
      parallelism: 1,
    });
  }

  /**
   * Verify plaintext password against Argon2id hash in constant time
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Hash refresh token using SHA-256 for secure database fingerprinting
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate cryptographically secure random opaque token
   */
  generateOpaqueToken(): string {
    return randomBytes(32).toString('hex');
  }
}
