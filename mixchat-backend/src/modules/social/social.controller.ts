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
} from '@nestjs/swagger';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { PaginatedSocialUsersDto } from './dto/social-user.dto';
import { PaginatedFollowRequestsDto } from './dto/follow-request.dto';
import {
  RelationshipActionResponseDto,
  SimpleMessageResponseDto,
  AcceptFollowRequestResponseDto,
} from './dto/social-action-response.dto';

@ApiTags('Social Graph & Privacy')
@ApiBearerAuth('access-token')
@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Follow user or send follow request if target is private',
  })
  @ApiResponse({ status: 200, type: RelationshipActionResponseDto })
  async follow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<RelationshipActionResponseDto> {
    return this.socialService.followUser(user.id, targetUserId);
  }

  @Delete('follow/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow user or cancel pending follow request' })
  @ApiResponse({ status: 200, type: RelationshipActionResponseDto })
  async unfollow(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<RelationshipActionResponseDto> {
    return this.socialService.unfollowUser(user.id, targetUserId);
  }

  @Delete('followers/:followerId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a follower from own profile' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async removeFollower(
    @CurrentUser() user: AuthenticatedUser,
    @Param('followerId') followerId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.removeFollower(user.id, followerId);
  }

  @Get('users/:userId/followers')
  @ApiOperation({ summary: 'Get followers for a specific user' })
  @ApiResponse({ status: 200, type: PaginatedSocialUsersDto })
  async getFollowers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedSocialUsersDto> {
    return this.socialService.getFollowers(
      user.id,
      targetUserId,
      query.cursor,
      query.limit,
    );
  }

  @Get('users/:userId/following')
  @ApiOperation({ summary: 'Get following for a specific user' })
  @ApiResponse({ status: 200, type: PaginatedSocialUsersDto })
  async getFollowing(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedSocialUsersDto> {
    return this.socialService.getFollowing(
      user.id,
      targetUserId,
      query.cursor,
      query.limit,
    );
  }

  @Get('follow-requests')
  @ApiOperation({ summary: 'Get incoming follow requests for private account' })
  @ApiResponse({ status: 200, type: PaginatedFollowRequestsDto })
  async getFollowRequests(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedFollowRequestsDto> {
    return this.socialService.getFollowRequests(
      user.id,
      query.cursor,
      query.limit,
    );
  }

  @Post('follow-requests/:requestId/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept incoming follow request' })
  @ApiResponse({ status: 200, type: AcceptFollowRequestResponseDto })
  async acceptFollowRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ): Promise<AcceptFollowRequestResponseDto> {
    return this.socialService.acceptFollowRequest(user.id, requestId);
  }

  @Post('follow-requests/:requestId/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline incoming follow request' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async declineFollowRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('requestId') requestId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.declineFollowRequest(user.id, requestId);
  }

  @Post('block/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Block a user and cascade remove all relationships',
  })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async blockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.blockUser(user.id, targetUserId);
  }

  @Delete('block/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async unblockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.unblockUser(user.id, targetUserId);
  }

  @Get('blocked')
  @ApiOperation({ summary: 'Get list of blocked users' })
  @ApiResponse({ status: 200, type: PaginatedSocialUsersDto })
  async getBlockedUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedSocialUsersDto> {
    return this.socialService.getBlockedUsers(
      user.id,
      query.cursor,
      query.limit,
    );
  }

  @Get('close-friends')
  @ApiOperation({ summary: 'Get list of close friends' })
  @ApiResponse({ status: 200, type: PaginatedSocialUsersDto })
  async getCloseFriends(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedSocialUsersDto> {
    return this.socialService.getCloseFriends(
      user.id,
      query.cursor,
      query.limit,
    );
  }

  @Post('close-friends/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add user to close friends' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async addCloseFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.addCloseFriend(user.id, targetUserId);
  }

  @Delete('close-friends/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove user from close friends' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async removeCloseFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') targetUserId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.socialService.removeCloseFriend(user.id, targetUserId);
  }
}
