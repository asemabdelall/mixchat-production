import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafetyService } from './safety.service';
import { SafetyActionResponseDto } from './dto/safety-action-response.dto';
import {
  PaginatedBlockedUsersDto,
  PaginatedMutedUsersDto,
} from './dto/blocked-muted-users.dto';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('Safety & User Controls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@Controller('safety')
export class SafetyController {
  constructor(private readonly safetyService: SafetyService) {}

  @Post('block/:userId')
  @HttpCode(HttpStatus.OK)
  @RateLimit('BLOCK_USER', 20, 300)
  @ApiOperation({
    summary: 'Block a user',
    description:
      'Block user and atomically clean up follow relationships, pending requests, and close friends.',
  })
  @ApiResponse({ status: 200, type: SafetyActionResponseDto })
  async blockUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ): Promise<SafetyActionResponseDto> {
    return this.safetyService.blockUser(currentUserId, targetUserId);
  }

  @Delete('block/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unblock a user',
  })
  @ApiResponse({ status: 200, type: SafetyActionResponseDto })
  async unblockUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ): Promise<SafetyActionResponseDto> {
    return this.safetyService.unblockUser(currentUserId, targetUserId);
  }

  @Get('blocked')
  @ApiOperation({
    summary: 'List accounts blocked by current user',
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedBlockedUsersDto })
  async getBlockedUsers(
    @CurrentUser('id') currentUserId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<PaginatedBlockedUsersDto> {
    return this.safetyService.getBlockedUsers(
      currentUserId,
      cursor,
      limit ? Number(limit) : 20,
    );
  }

  @Post('mute/:userId')
  @HttpCode(HttpStatus.OK)
  @RateLimit('MUTE_USER', 30, 300)
  @ApiOperation({
    summary: 'Mute an account',
    description: 'Mute user to suppress their content from personalized feeds.',
  })
  @ApiResponse({ status: 200, type: SafetyActionResponseDto })
  async muteUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ): Promise<SafetyActionResponseDto> {
    return this.safetyService.muteUser(currentUserId, targetUserId);
  }

  @Delete('mute/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Unmute an account',
  })
  @ApiResponse({ status: 200, type: SafetyActionResponseDto })
  async unmuteUser(
    @CurrentUser('id') currentUserId: string,
    @Param('userId') targetUserId: string,
  ): Promise<SafetyActionResponseDto> {
    return this.safetyService.unmuteUser(currentUserId, targetUserId);
  }

  @Get('muted')
  @ApiOperation({
    summary: 'List accounts muted by current user',
  })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedMutedUsersDto })
  async getMutedUsers(
    @CurrentUser('id') currentUserId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<PaginatedMutedUsersDto> {
    return this.safetyService.getMutedUsers(
      currentUserId,
      cursor,
      limit ? Number(limit) : 20,
    );
  }
}
