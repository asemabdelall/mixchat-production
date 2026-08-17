import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { SocialPolicyService } from '../social/social-policy.service';
import { UserStatus } from '@prisma/client';

export const MAX_MENTIONS_PER_COMMENT = 10;

export interface ResolvedMention {
  userId: string;
  username: string;
}

@Injectable()
export class MentionService {
  private readonly logger = new Logger(MentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socialPolicy: SocialPolicyService,
  ) {}

  /**
   * Extracts valid username tokens prefixed by '@' from text
   */
  extractMentionCandidates(text: string): string[] {
    if (!text) return [];

    // Regex matching @username tokens (3 to 30 alphanumeric/underscore characters)
    const mentionRegex = /(?:^|[^\w])@([a-zA-Z0-9_]{3,30})/g;
    const matches = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match[1]) {
        matches.add(match[1].toLowerCase());
      }
    }

    return Array.from(matches).slice(0, MAX_MENTIONS_PER_COMMENT);
  }

  /**
   * Resolves mention candidates into validated, accessible user IDs respecting blocks & privacy
   */
  async resolveMentions(
    authorId: string,
    text: string,
  ): Promise<ResolvedMention[]> {
    const candidates = this.extractMentionCandidates(text);
    if (candidates.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        username: { in: candidates, mode: 'insensitive' },
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
        username: true,
        privacySettings: {
          select: {
            allowMentions: true,
          },
        },
      },
    });

    const resolved: ResolvedMention[] = [];

    for (const user of users) {
      // Author mentioning themselves is valid but doesn't need block check
      if (user.id === authorId) {
        resolved.push({ userId: user.id, username: user.username });
        continue;
      }

      // Check block rules
      const blockCheck = await this.socialPolicy.isBlockedEitherDirection(
        authorId,
        user.id,
      );
      if (blockCheck.isBlocked) {
        continue;
      }

      // Check Privacy Settings (allowMentions)
      const privacy = user.privacySettings;
      if (privacy && privacy.allowMentions === 'None') {
        continue;
      }

      if (privacy && privacy.allowMentions === 'Following') {
        const isFollowedByTarget = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: user.id,
              followingId: authorId,
            },
          },
        });
        if (!isFollowedByTarget) {
          continue;
        }
      }

      resolved.push({
        userId: user.id,
        username: user.username,
      });
    }

    return resolved;
  }
}
