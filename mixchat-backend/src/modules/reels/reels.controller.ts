import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Patch,
  Body,
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
  ApiParam,
} from '@nestjs/swagger';
import { ReelsService } from './reels.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReelDto } from './dto/create-reel.dto';
import { ReelsQueryDto } from './dto/reels-query.dto';
import {
  ReelItemDto,
  PaginatedReelsResponseDto,
  ReelLikeResponseDto,
  ReelBookmarkResponseDto,
} from './dto/reel-response.dto';
import {
  WatchStartDto,
  WatchProgressDto,
  WatchEndDto,
  WatchTelemetryResponseDto,
} from './dto/watch-telemetry.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('reels')
@Controller('reels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReelsController {
  constructor(private readonly reelsService: ReelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new vertical Reel from a READY video MediaObject',
  })
  @ApiResponse({
    status: 201,
    description: 'Reel created successfully',
    type: ReelItemDto,
  })
  async createReel(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReelDto,
  ): Promise<ReelItemDto> {
    return await this.reelsService.createReel(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated Reels feed (For You or Following)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated vertical video feed',
    type: PaginatedReelsResponseDto,
  })
  async getFeed(
    @CurrentUser('id') userId: string,
    @Query() query: ReelsQueryDto,
  ): Promise<PaginatedReelsResponseDto> {
    return await this.reelsService.getReelsFeed(userId, query);
  }

  @Get('user/:username')
  @ApiOperation({ summary: 'Get paginated Reels created by a specific user' })
  @ApiParam({ name: 'username', description: 'Target user username' })
  @ApiResponse({
    status: 200,
    description: 'User published Reels',
    type: PaginatedReelsResponseDto,
  })
  async getUserReels(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
    @Query() query: ReelsQueryDto,
  ): Promise<PaginatedReelsResponseDto> {
    return await this.reelsService.getUserReels(userId, username, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single Reel details with video URL and viewer state',
  })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reel details',
    type: ReelItemDto,
  })
  async getReelById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ReelItemDto> {
    return await this.reelsService.getReelById(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an existing Reel (Author only)' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reel deleted',
    type: SimpleMessageResponseDto,
  })
  async deleteReel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<SimpleMessageResponseDto> {
    return await this.reelsService.deleteReel(userId, id);
  }

  @Put(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like a Reel (Idempotent)' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Like status and updated count',
    type: ReelLikeResponseDto,
  })
  async likeReel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ReelLikeResponseDto> {
    return await this.reelsService.likeReel(userId, id);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Unlike a Reel (Idempotent)' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Unlike status and updated count',
    type: ReelLikeResponseDto,
  })
  async unlikeReel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ReelLikeResponseDto> {
    return await this.reelsService.unlikeReel(userId, id);
  }

  @Put(':id/bookmark')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bookmark / save a Reel (Idempotent)' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark status and updated count',
    type: ReelBookmarkResponseDto,
  })
  async bookmarkReel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ReelBookmarkResponseDto> {
    return await this.reelsService.bookmarkReel(userId, id);
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Remove a bookmark on a Reel (Idempotent)' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Bookmark removed status and updated count',
    type: ReelBookmarkResponseDto,
  })
  async unbookmarkReel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<ReelBookmarkResponseDto> {
    return await this.reelsService.unbookmarkReel(userId, id);
  }

  @Post(':id/watch/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a watch session for a Reel' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Watch session started',
    type: WatchTelemetryResponseDto,
  })
  async watchStart(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: WatchStartDto,
  ): Promise<WatchTelemetryResponseDto> {
    return await this.reelsService.recordWatchStart(userId, id, dto);
  }

  @Patch(':id/watch/progress')
  @ApiOperation({
    summary:
      'Checkpoint watch progress and calculate qualified view / completion',
  })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Watch progress recorded',
    type: WatchTelemetryResponseDto,
  })
  async watchProgress(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: WatchProgressDto,
  ): Promise<WatchTelemetryResponseDto> {
    return await this.reelsService.recordWatchProgress(userId, id, dto);
  }

  @Post(':id/watch/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalize and close an active watch session' })
  @ApiParam({ name: 'id', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Watch session ended',
    type: WatchTelemetryResponseDto,
  })
  async watchEnd(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: WatchEndDto,
  ): Promise<WatchTelemetryResponseDto> {
    return await this.reelsService.recordWatchEnd(userId, id, dto);
  }
}
