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
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsQueryDto } from './dto/comments-query.dto';
import {
  CommentDto,
  CommentLikeResponseDto,
  PaginatedCommentsResponseDto,
} from './dto/comment-response.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('comments')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a top-level comment on a post' })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentDto,
  })
  async createComment(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return await this.commentsService.createComment(userId, postId, dto);
  }

  @Get('posts/:postId/comments')
  @ApiOperation({
    summary: 'Get cursor-paginated top-level comments for a post',
  })
  @ApiParam({ name: 'postId', description: 'Post UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated top-level comments',
    type: PaginatedCommentsResponseDto,
  })
  async getPostComments(
    @CurrentUser('id') userId: string,
    @Param('postId') postId: string,
    @Query() query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    return await this.commentsService.getPostComments(userId, postId, query);
  }

  @Post('reels/:reelId/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a top-level comment on a Reel' })
  @ApiParam({ name: 'reelId', description: 'Reel UUID' })
  @ApiResponse({
    status: 201,
    description: 'Reel comment created successfully',
    type: CommentDto,
  })
  async createReelComment(
    @CurrentUser('id') userId: string,
    @Param('reelId') reelId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return await this.commentsService.createReelComment(userId, reelId, dto);
  }

  @Get('reels/:reelId/comments')
  @ApiOperation({
    summary: 'Get cursor-paginated top-level comments for a Reel',
  })
  @ApiParam({ name: 'reelId', description: 'Reel UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated Reel top-level comments',
    type: PaginatedCommentsResponseDto,
  })
  async getReelComments(
    @CurrentUser('id') userId: string,
    @Param('reelId') reelId: string,
    @Query() query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    return await this.commentsService.getReelComments(userId, reelId, query);
  }

  @Post('comments/:commentId/replies')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Reply to an existing comment' })
  @ApiParam({ name: 'commentId', description: 'Parent comment UUID' })
  @ApiResponse({
    status: 201,
    description: 'Reply created successfully',
    type: CommentDto,
  })
  async createReply(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return await this.commentsService.createReply(userId, commentId, dto);
  }

  @Get('comments/:commentId/replies')
  @ApiOperation({
    summary: 'Get cursor-paginated replies for a comment thread',
  })
  @ApiParam({ name: 'commentId', description: 'Parent / root comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated thread replies',
    type: PaginatedCommentsResponseDto,
  })
  async getCommentReplies(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
    @Query() query: CommentsQueryDto,
  ): Promise<PaginatedCommentsResponseDto> {
    return await this.commentsService.getCommentReplies(
      userId,
      commentId,
      query,
    );
  }

  @Patch('comments/:id')
  @ApiOperation({ summary: 'Update comment content (author only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Updated comment details',
    type: CommentDto,
  })
  async updateComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    return await this.commentsService.updateComment(userId, commentId, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete comment (author only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    type: SimpleMessageResponseDto,
  })
  async deleteComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
  ): Promise<SimpleMessageResponseDto> {
    return await this.commentsService.deleteComment(userId, commentId);
  }

  @Put('comments/:id/like')
  @ApiOperation({ summary: 'Idempotent like comment mutation' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment liked status and count',
    type: CommentLikeResponseDto,
  })
  async likeComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
  ): Promise<CommentLikeResponseDto> {
    return await this.commentsService.likeComment(userId, commentId);
  }

  @Delete('comments/:id/like')
  @ApiOperation({ summary: 'Idempotent unlike comment mutation' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Comment unliked status and count',
    type: CommentLikeResponseDto,
  })
  async unlikeComment(
    @CurrentUser('id') userId: string,
    @Param('id') commentId: string,
  ): Promise<CommentLikeResponseDto> {
    return await this.commentsService.unlikeComment(userId, commentId);
  }
}
