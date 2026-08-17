import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AnonymousMatchmakingService } from './anonymous-matchmaking.service';
import { AnonymousSessionService } from './anonymous-session.service';
import { AnonymousGateway } from './anonymous.gateway';
import { JoinQueueDto } from './dto/join-queue.dto';
import {
  SendAnonymousMessageDto,
  SkipAnonymousSessionDto,
  ReportAnonymousSessionDto,
} from './dto/anonymous-session-actions.dto';
import {
  AnonymousQueueStatusDto,
  AnonymousSessionDto,
  AnonymousMessageDto,
  AnonymousActionResponseDto,
  AnonymousReportResponseDto,
} from './dto/anonymous-response.dto';
import { RealtimeEvents } from '../chat/realtime/realtime-events';

@ApiTags('Anonymous Matching & Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'anonymous', version: '1' })
export class AnonymousController {
  constructor(
    private readonly matchmakingService: AnonymousMatchmakingService,
    private readonly sessionService: AnonymousSessionService,
    private readonly gateway: AnonymousGateway,
  ) {}

  @Post('queue/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Join anonymous matchmaking queue',
    description:
      'Enqueues user with optional interests and attempts immediate match.',
  })
  @ApiResponse({ status: 200, type: AnonymousQueueStatusDto })
  async joinQueue(
    @CurrentUser('id') userId: string,
    @Body() dto: JoinQueueDto,
  ): Promise<AnonymousQueueStatusDto> {
    const result = await this.matchmakingService.joinQueue(
      userId,
      dto.interests,
    );

    if (result.status === 'MATCHED' && result.session) {
      // Notify both participants via WebSocket
      await this.gateway.broadcastMatchFound(
        result.session.id,
        result.session.participantA.userId,
        result.session.participantB.userId,
      );

      const sessionDto = await this.sessionService.getSessionDto(
        result.session.id,
        userId,
      );

      return {
        status: 'MATCHED',
        session: sessionDto,
      };
    }

    return {
      status: 'SEARCHING',
      joinedAt: result.joinedAt,
      interests: result.interests,
    };
  }

  @Post('queue/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave matchmaking queue',
    description:
      'Cancels active search and removes user from queues idempotently.',
  })
  @ApiResponse({ status: 200, type: AnonymousActionResponseDto })
  async leaveQueue(
    @CurrentUser('id') userId: string,
  ): Promise<AnonymousActionResponseDto> {
    await this.matchmakingService.leaveQueue(userId);
    return { success: true, message: 'Successfully left matchmaking queue' };
  }

  @Get('queue/status')
  @ApiOperation({
    summary: 'Get current matchmaking / active session status',
    description: 'Returns SEARCHING, MATCHED, or IDLE state for user.',
  })
  @ApiResponse({ status: 200, type: AnonymousQueueStatusDto })
  async getStatus(
    @CurrentUser('id') userId: string,
  ): Promise<AnonymousQueueStatusDto> {
    const status = await this.matchmakingService.getStatus(userId);

    if (status.status === 'MATCHED' && status.session) {
      const sessionDto = await this.sessionService.getSessionDto(
        status.session.id,
        userId,
      );
      return {
        status: 'MATCHED',
        session: sessionDto,
      };
    }

    return {
      status: status.status,
      joinedAt: status.joinedAt,
      interests: status.interests,
    };
  }

  @Get('session/:id')
  @ApiOperation({
    summary: 'Get anonymous session details and message history',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousSessionDto })
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<AnonymousSessionDto> {
    return this.sessionService.getSessionDto(sessionId, userId);
  }

  @Post('session/:id/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send text, voice note, or media message in anonymous session',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousMessageDto })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: SendAnonymousMessageDto,
  ): Promise<AnonymousMessageDto> {
    const { message, partnerUserId } = await this.sessionService.sendMessage(
      sessionId,
      userId,
      dto,
    );

    // Emit realtime event to partner
    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_MESSAGE_NEW, {
        ...message,
        isOwn: false,
      });

    return {
      ...message,
      isOwn: true,
    };
  }

  @Post('session/:id/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Skip current match and optionally requeue',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousQueueStatusDto })
  async skipSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: SkipAnonymousSessionDto,
  ): Promise<AnonymousQueueStatusDto> {
    const { partnerUserId } = await this.sessionService.skipSession(
      sessionId,
      userId,
    );

    // Notify partner that session was skipped
    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, {
        sessionId,
        reason: 'SKIPPED',
      });

    if (dto.requeue !== false) {
      return this.joinQueue(userId, { interests: dto.interests });
    }

    return { status: 'IDLE' };
  }

  @Post('session/:id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave and terminate anonymous session',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousActionResponseDto })
  async leaveSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<AnonymousActionResponseDto> {
    const { partnerUserId } = await this.sessionService.leaveSession(
      sessionId,
      userId,
    );

    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, {
        sessionId,
        reason: 'LEFT',
      });

    return { success: true, message: 'Session ended successfully' };
  }

  @Post('session/:id/reveal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request or accept mutual identity reveal',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousSessionDto })
  async requestReveal(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<AnonymousSessionDto> {
    const { isMutual, session, partnerUserId } =
      await this.sessionService.requestReveal(sessionId, userId);

    if (isMutual) {
      // Broadcast revealed identities
      const sessionDtoA = await this.sessionService.getSessionDto(
        sessionId,
        session.participantA.userId,
      );
      const sessionDtoB = await this.sessionService.getSessionDto(
        sessionId,
        session.participantB.userId,
      );

      this.gateway.server
        .to(`user:${session.participantA.userId}`)
        .emit(RealtimeEvents.ANONYMOUS_IDENTITY_REVEALED, {
          sessionId,
          revealedPartner: sessionDtoA.revealedPartner,
        });

      this.gateway.server
        .to(`user:${session.participantB.userId}`)
        .emit(RealtimeEvents.ANONYMOUS_IDENTITY_REVEALED, {
          sessionId,
          revealedPartner: sessionDtoB.revealedPartner,
        });
    } else {
      // Notify partner of reveal request with zero real identity data
      this.gateway.server
        .to(`user:${partnerUserId}`)
        .emit(RealtimeEvents.ANONYMOUS_REVEAL_REQUESTED, { sessionId });
    }

    return this.sessionService.getSessionDto(sessionId, userId);
  }

  @Delete('session/:id/reveal')
  @ApiOperation({
    summary: 'Cancel pending reveal request before mutual consent',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousSessionDto })
  async cancelReveal(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<AnonymousSessionDto> {
    const { partnerUserId } = await this.sessionService.cancelReveal(
      sessionId,
      userId,
    );

    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_REVEAL_CANCELLED, { sessionId });

    return this.sessionService.getSessionDto(sessionId, userId);
  }

  @Post('session/:id/block')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anonymously block partner without identity disclosure',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousActionResponseDto })
  async blockPartner(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ): Promise<AnonymousActionResponseDto> {
    const { partnerUserId } = await this.sessionService.blockPartner(
      sessionId,
      userId,
    );

    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, {
        sessionId,
        reason: 'BLOCKED',
      });

    return {
      success: true,
      message: 'User blocked and anonymous session terminated',
    };
  }

  @Post('session/:id/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Anonymously report partner for safety/moderation review',
  })
  @ApiParam({ name: 'id', description: 'Anonymous session ID' })
  @ApiResponse({ status: 200, type: AnonymousReportResponseDto })
  async reportPartner(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: ReportAnonymousSessionDto,
  ): Promise<AnonymousReportResponseDto> {
    const { reportId, partnerUserId } = await this.sessionService.reportPartner(
      sessionId,
      userId,
      dto.reason,
      dto.details,
      dto.messageSnippets,
    );

    this.gateway.server
      .to(`user:${partnerUserId}`)
      .emit(RealtimeEvents.ANONYMOUS_PARTNER_LEFT, {
        sessionId,
        reason: 'REPORTED',
      });

    return {
      success: true,
      reportId,
    };
  }
}
