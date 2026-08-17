import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MediaService } from '../media/media.service';
import {
  AnonymousMatchmakingStore,
  StoredAnonymousSession,
  StoredAnonymousMessage,
} from './anonymous-matchmaking.store';
import {
  AnonymousSessionDto,
  AnonymousMessageDto,
  AnonymousRevealedUserDto,
} from './dto/anonymous-response.dto';
import {
  SendAnonymousMessageDto,
  AnonymousMessageType,
} from './dto/anonymous-session-actions.dto';

@Injectable()
export class AnonymousSessionService {
  private readonly logger = new Logger(AnonymousSessionService.name);

  constructor(
    private readonly store: AnonymousMatchmakingStore,
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Resolves and maps an anonymous session safely for a viewer.
   * INVARIANT: Real identity fields of the partner are NEVER serialized
   * unless mutual reveal consent has been established.
   */
  async getSessionDto(
    sessionId: string,
    viewerUserId: string,
  ): Promise<AnonymousSessionDto> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found or expired');
    }

    const isUserA = session.participantA.userId === viewerUserId;
    const isUserB = session.participantB.userId === viewerUserId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException(
        'You are not a participant in this anonymous session',
      );
    }

    const myParticipant = isUserA ? session.participantA : session.participantB;
    const partnerParticipant = isUserA
      ? session.participantB
      : session.participantA;

    const isMutual =
      session.status === 'REVEALED' ||
      (session.participantA.revealConsent &&
        session.participantB.revealConsent);

    let revealedPartner: AnonymousRevealedUserDto | null = null;

    if (isMutual) {
      const partnerUser = await this.prisma.user.findUnique({
        where: { id: partnerParticipant.userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          isPremium: true,
          bio: true,
        },
      });

      if (partnerUser) {
        revealedPartner = {
          id: partnerUser.id,
          username: partnerUser.username,
          displayName: partnerUser.displayName || partnerUser.username,
          avatarUrl: partnerUser.avatarUrl,
          isVerified: partnerUser.isVerified,
          isPremium: partnerUser.isPremium,
          bio: partnerUser.bio,
        };
      }
    }

    // Map messages with opaque sender identifiers
    const mappedMessages: AnonymousMessageDto[] = session.messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      senderId: m.senderPersonaId,
      isOwn: m.senderUserId === viewerUserId,
      type: m.type,
      content: m.content,
      mediaUrl: m.mediaUrl,
      voiceDurationMs: m.voiceDurationMs,
      createdAt: m.createdAt,
    }));

    return {
      id: session.id,
      status: session.status,
      endReason: session.endReason,
      me: myParticipant.persona,
      partner: partnerParticipant.persona,
      matchedInterests: session.matchedInterests,
      revealConsent: {
        me: myParticipant.revealConsent,
        partner: partnerParticipant.revealConsent,
        isMutual,
      },
      revealedPartner,
      messages: mappedMessages,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Internal session retriever for authorization and routing.
   */
  async getStoredSession(
    sessionId: string,
  ): Promise<StoredAnonymousSession | null> {
    return this.store.getSession(sessionId);
  }

  /**
   * Sends a message within the anonymous session.
   */
  async sendMessage(
    sessionId: string,
    senderUserId: string,
    payload: SendAnonymousMessageDto,
  ): Promise<{
    message: AnonymousMessageDto;
    partnerUserId: string;
    session: StoredAnonymousSession;
  }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    if (session.status === 'ENDED') {
      throw new BadRequestException('Cannot send message to an ended session');
    }

    const isUserA = session.participantA.userId === senderUserId;
    const isUserB = session.participantB.userId === senderUserId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException(
        'You are not a participant in this anonymous session',
      );
    }

    const senderParticipant = isUserA
      ? session.participantA
      : session.participantB;
    const partnerParticipant = isUserA
      ? session.participantB
      : session.participantA;

    let mediaUrl: string | undefined;

    // Validate media object if provided
    if (payload.mediaId) {
      try {
        const mediaObject = await this.mediaService.getMedia(
          senderUserId,
          payload.mediaId,
        );
        mediaUrl = mediaObject.publicUrl || undefined;
      } catch {
        throw new BadRequestException(
          'Attached media file not found or invalid',
        );
      }
    }

    const messageType = payload.type || AnonymousMessageType.TEXT;
    if (messageType === AnonymousMessageType.TEXT && !payload.content?.trim()) {
      throw new BadRequestException('Text message cannot be empty');
    }

    const messageId = `anon_msg_${randomBytes(8).toString('hex')}`;
    const createdAt = new Date().toISOString();

    const storedMessage: StoredAnonymousMessage = {
      id: messageId,
      sessionId: session.id,
      senderUserId,
      senderPersonaId: senderParticipant.persona.id,
      type: messageType,
      content: payload.content?.trim(),
      mediaUrl,
      voiceDurationMs: payload.voiceDurationMs,
      createdAt,
    };

    // Keep bounded in-memory message history for session duration
    session.messages.push(storedMessage);
    if (session.messages.length > 200) {
      session.messages = session.messages.slice(-200);
    }

    await this.store.saveSession(session);

    const clientMessage: AnonymousMessageDto = {
      id: storedMessage.id,
      sessionId: storedMessage.sessionId,
      senderId: storedMessage.senderPersonaId,
      isOwn: false, // Default context; client computes isOwn via senderId === me.id
      type: storedMessage.type,
      content: storedMessage.content,
      mediaUrl: storedMessage.mediaUrl,
      voiceDurationMs: storedMessage.voiceDurationMs,
      createdAt: storedMessage.createdAt,
    };

    return {
      message: clientMessage,
      partnerUserId: partnerParticipant.userId,
      session,
    };
  }

  /**
   * Explicitly ends an anonymous session.
   */
  async leaveSession(
    sessionId: string,
    userId: string,
  ): Promise<{ partnerUserId: string }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    const isUserA = session.participantA.userId === userId;
    const isUserB = session.participantB.userId === userId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    const partnerUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    await this.store.endSession(
      sessionId,
      session.participantA.userId,
      session.participantB.userId,
      'LEFT',
    );

    return { partnerUserId };
  }

  /**
   * Skips an anonymous session.
   */
  async skipSession(
    sessionId: string,
    userId: string,
  ): Promise<{ partnerUserId: string; session: StoredAnonymousSession }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    const isUserA = session.participantA.userId === userId;
    const isUserB = session.participantB.userId === userId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    const partnerUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    await this.store.endSession(
      sessionId,
      session.participantA.userId,
      session.participantB.userId,
      'SKIPPED',
    );

    return { partnerUserId, session };
  }

  /**
   * Records reveal consent from user.
   * Evaluates mutual reveal atomicity.
   */
  async requestReveal(
    sessionId: string,
    userId: string,
  ): Promise<{
    isMutual: boolean;
    session: StoredAnonymousSession;
    partnerUserId: string;
  }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    if (session.status === 'ENDED') {
      throw new BadRequestException(
        'Cannot reveal identity in an ended session',
      );
    }

    const isUserA = session.participantA.userId === userId;
    const isUserB = session.participantB.userId === userId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    if (isUserA) {
      session.participantA.revealConsent = true;
    } else {
      session.participantB.revealConsent = true;
    }

    const isMutual =
      session.participantA.revealConsent && session.participantB.revealConsent;

    if (isMutual) {
      session.status = 'REVEALED';
    }

    await this.store.saveSession(session);

    const partnerUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    return { isMutual, session, partnerUserId };
  }

  /**
   * Cancels a pending reveal request before mutual consent.
   */
  async cancelReveal(
    sessionId: string,
    userId: string,
  ): Promise<{ session: StoredAnonymousSession; partnerUserId: string }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    if (session.status === 'REVEALED') {
      throw new BadRequestException(
        'Identity already revealed mutually; cannot cancel',
      );
    }

    const isUserA = session.participantA.userId === userId;
    const isUserB = session.participantB.userId === userId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    if (isUserA) {
      session.participantA.revealConsent = false;
    } else {
      session.participantB.revealConsent = false;
    }

    await this.store.saveSession(session);

    const partnerUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    return { session, partnerUserId };
  }

  /**
   * Anonymously blocks the partner:
   * Resolves real partner ID internally, creates Phase 2 Block record in Prisma,
   * and terminates anonymous session without revealing identity to either party.
   */
  async blockPartner(
    sessionId: string,
    blockerUserId: string,
  ): Promise<{ partnerUserId: string }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    const isUserA = session.participantA.userId === blockerUserId;
    const isUserB = session.participantB.userId === blockerUserId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    const partnerUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    // Create durable block in PostgreSQL
    await this.prisma.$transaction(async (tx) => {
      // Upsert block
      await tx.block.upsert({
        where: {
          blockerId_blockedId: {
            blockerId: blockerUserId,
            blockedId: partnerUserId,
          },
        },
        create: {
          blockerId: blockerUserId,
          blockedId: partnerUserId,
        },
        update: {},
      });

      // Cleanup bidirectional follow relations
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerUserId, followingId: partnerUserId },
            { followerId: partnerUserId, followingId: blockerUserId },
          ],
        },
      });

      // Cleanup follow requests
      await tx.followRequest.deleteMany({
        where: {
          OR: [
            { requesterId: blockerUserId, targetId: partnerUserId },
            { requesterId: partnerUserId, targetId: blockerUserId },
          ],
        },
      });
    });

    // Terminate anonymous session
    await this.store.endSession(
      sessionId,
      session.participantA.userId,
      session.participantB.userId,
      'BLOCKED',
    );

    return { partnerUserId };
  }

  /**
   * Anonymously reports the partner:
   * Creates an AnonymousReport record in PostgreSQL for future Phase 14 moderation.
   */
  async reportPartner(
    sessionId: string,
    reporterUserId: string,
    reason: string,
    details?: string,
    messageSnippets?: string[],
  ): Promise<{ reportId: string; partnerUserId: string }> {
    const session = await this.store.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Anonymous session not found');
    }

    const isUserA = session.participantA.userId === reporterUserId;
    const isUserB = session.participantB.userId === reporterUserId;

    if (!isUserA && !isUserB) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    const reportedUserId = isUserA
      ? session.participantB.userId
      : session.participantA.userId;

    const report = await this.prisma.anonymousReport.create({
      data: {
        reporterId: reporterUserId,
        reportedUserId,
        anonymousSessionId: sessionId,
        reason,
        details,
        messageSnippets: messageSnippets
          ? JSON.stringify(messageSnippets)
          : undefined,
      },
    });

    // Also end session with reason REPORTED
    await this.store.endSession(
      sessionId,
      session.participantA.userId,
      session.participantB.userId,
      'REPORTED',
    );

    return {
      reportId: report.id,
      partnerUserId: reportedUserId,
    };
  }
}
