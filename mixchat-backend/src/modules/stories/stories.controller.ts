import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StoriesService } from './stories.service';
import { CreateStoryDto } from './dto/create-story.dto';
import { ReactStoryDto } from './dto/react-story.dto';
import { CreateStoryReplyDto } from './dto/create-story-reply.dto';
import { StoryPaginationQueryDto } from './dto/story-query.dto';
import {
  ActiveStoriesResponseDto,
  StoryArchiveResponseDto,
  StoryItemDto,
  StoryRepliesResponseDto,
  StoryReplyItemDto,
  StoryViewersResponseDto,
} from './dto/story-response.dto';

@ApiTags('stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new 24h Story referencing a READY MediaObject',
  })
  @ApiResponse({
    status: 201,
    description: 'Story created successfully',
    type: StoryItemDto,
  })
  async createStory(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStoryDto,
  ): Promise<StoryItemDto> {
    return this.storiesService.createStory(userId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active 24h story groups for the story tray' })
  @ApiResponse({
    status: 200,
    description: 'Active story groups',
    type: ActiveStoriesResponseDto,
  })
  async getActiveStories(
    @CurrentUser('id') userId: string,
  ): Promise<ActiveStoriesResponseDto> {
    return this.storiesService.getActiveStories(userId);
  }

  @Get('archive')
  @ApiOperation({
    summary: 'Get authenticated user story archive (cursor-paginated)',
  })
  @ApiResponse({
    status: 200,
    description: 'Story archive list',
    type: StoryArchiveResponseDto,
  })
  async getArchive(
    @CurrentUser('id') userId: string,
    @Query() query: StoryPaginationQueryDto,
  ): Promise<StoryArchiveResponseDto> {
    return this.storiesService.getArchive(userId, query.cursor, query.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single story by ID' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({
    status: 200,
    description: 'Story details',
    type: StoryItemDto,
  })
  async getStoryById(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
  ): Promise<StoryItemDto> {
    return this.storiesService.getStoryById(storyId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a story (Author only)' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Story deleted successfully' })
  async deleteStory(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.storiesService.deleteStory(storyId, userId);
  }

  @Put(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record an idempotent view for a story' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'View recorded successfully' })
  async recordView(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.storiesService.recordView(storyId, userId);
  }

  @Get(':id/viewers')
  @ApiOperation({
    summary: 'Get viewers list for a story (Author only, cursor-paginated)',
  })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({
    status: 200,
    description: 'Story viewers list',
    type: StoryViewersResponseDto,
  })
  async getViewers(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
    @Query() query: StoryPaginationQueryDto,
  ): Promise<StoryViewersResponseDto> {
    return this.storiesService.getViewers(
      storyId,
      userId,
      query.cursor,
      query.limit,
    );
  }

  @Put(':id/reaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'React to a story with an emoji reaction' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Reaction applied successfully' })
  async reactToStory(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReactStoryDto,
  ): Promise<{ success: boolean; reaction: string }> {
    return this.storiesService.reactToStory(storyId, userId, dto);
  }

  @Delete(':id/reaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove reaction from a story' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  async removeReaction(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    return this.storiesService.removeReaction(storyId, userId);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'Reply to a story with a message' })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: StoryReplyItemDto,
  })
  async createReply(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateStoryReplyDto,
  ): Promise<StoryReplyItemDto> {
    return this.storiesService.createReply(storyId, userId, dto);
  }

  @Get(':id/replies')
  @ApiOperation({
    summary: 'Get replies for a story (Author only, cursor-paginated)',
  })
  @ApiParam({ name: 'id', description: 'Story ID' })
  @ApiResponse({
    status: 200,
    description: 'Story replies list',
    type: StoryRepliesResponseDto,
  })
  async getReplies(
    @Param('id') storyId: string,
    @CurrentUser('id') userId: string,
    @Query() query: StoryPaginationQueryDto,
  ): Promise<StoryRepliesResponseDto> {
    return this.storiesService.getReplies(
      storyId,
      userId,
      query.cursor,
      query.limit,
    );
  }
}
