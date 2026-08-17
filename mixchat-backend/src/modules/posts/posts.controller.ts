import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
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
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { FeedQueryDto, UserPostsQueryDto } from './dto/feed-query.dto';
import {
  PaginatedFeedResponseDto,
  PostFeedItemDto,
  LikeResponseDto,
  BookmarkResponseDto,
  RepostResponseDto,
} from './dto/post-response.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('posts')
@Controller('posts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new post with text and/or attached media',
  })
  @ApiResponse({
    status: 201,
    description: 'Post created successfully',
    type: PostFeedItemDto,
  })
  async createPost(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePostDto,
  ): Promise<PostFeedItemDto> {
    return await this.postsService.createPost(userId, dto);
  }

  @Get('feed')
  @ApiOperation({
    summary: 'Get cursor-paginated social feed (For You, Following, Trending)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated feed items',
    type: PaginatedFeedResponseDto,
  })
  async getFeed(
    @CurrentUser('id') userId: string,
    @Query() query: FeedQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    return await this.postsService.getFeed(userId, query);
  }

  @Get('bookmarks')
  @ApiOperation({ summary: 'Get current user saved/bookmarked posts' })
  @ApiResponse({
    status: 200,
    description: 'Paginated bookmarked posts',
    type: PaginatedFeedResponseDto,
  })
  async getBookmarkedPosts(
    @CurrentUser('id') userId: string,
    @Query() query: UserPostsQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    return await this.postsService.getBookmarkedPosts(userId, query);
  }

  @Get('user/:username')
  @ApiOperation({
    summary: 'Get user posts by username with cursor pagination',
  })
  @ApiParam({ name: 'username', description: 'Username of profile owner' })
  @ApiResponse({
    status: 200,
    description: 'User posts feed',
    type: PaginatedFeedResponseDto,
  })
  async getUserPosts(
    @CurrentUser('id') userId: string,
    @Param('username') username: string,
    @Query() query: UserPostsQueryDto,
  ): Promise<PaginatedFeedResponseDto> {
    return await this.postsService.getUserPosts(userId, username, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single post details by ID' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post details',
    type: PostFeedItemDto,
  })
  async getPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<PostFeedItemDto> {
    return await this.postsService.getPost(userId, postId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update post content and visibility (author only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Updated post details',
    type: PostFeedItemDto,
  })
  async updatePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostFeedItemDto> {
    return await this.postsService.updatePost(userId, postId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete post (author only)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post deleted successfully',
    type: SimpleMessageResponseDto,
  })
  async deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<{ message: string }> {
    return await this.postsService.deletePost(userId, postId);
  }

  @Put(':id/like')
  @ApiOperation({ summary: 'Idempotent like post mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post liked status and count',
    type: LikeResponseDto,
  })
  async likePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<LikeResponseDto> {
    return await this.postsService.likePost(userId, postId);
  }

  @Delete(':id/like')
  @ApiOperation({ summary: 'Idempotent unlike post mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post unliked status and count',
    type: LikeResponseDto,
  })
  async unlikePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<LikeResponseDto> {
    return await this.postsService.unlikePost(userId, postId);
  }

  @Put(':id/bookmark')
  @ApiOperation({ summary: 'Idempotent bookmark post mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post bookmarked status',
    type: BookmarkResponseDto,
  })
  async bookmarkPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<BookmarkResponseDto> {
    return await this.postsService.bookmarkPost(userId, postId);
  }

  @Delete(':id/bookmark')
  @ApiOperation({ summary: 'Idempotent unbookmark post mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post unbookmarked status',
    type: BookmarkResponseDto,
  })
  async unbookmarkPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<BookmarkResponseDto> {
    return await this.postsService.unbookmarkPost(userId, postId);
  }

  @Put(':id/repost')
  @ApiOperation({ summary: 'Idempotent repost mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post reposted status and count',
    type: RepostResponseDto,
  })
  async repostPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<RepostResponseDto> {
    return await this.postsService.repostPost(userId, postId);
  }

  @Delete(':id/repost')
  @ApiOperation({ summary: 'Idempotent undo repost mutation' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Post repost removed status and count',
    type: RepostResponseDto,
  })
  async unrepostPost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
  ): Promise<RepostResponseDto> {
    return await this.postsService.unrepostPost(userId, postId);
  }
}
