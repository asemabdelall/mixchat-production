import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { PublicProfileDto, PrivacySettingsDto } from './dto/user-profile.dto';
import { UserDto } from '../auth/dto/auth-response.dto';
import { SocialUserItemDto } from '../social/dto/social-user.dto';
import { SearchUsersQueryDto } from './dto/search-users-query.dto';

@ApiTags('Users & Profiles')
@ApiBearerAuth('access-token')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and stats' })
  @ApiResponse({ status: 200, type: UserDto })
  async getOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserDto> {
    return this.usersService.getOwnProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserDto })
  async updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateOwnProfile(user.id, dto);
  }

  @Get('me/privacy')
  @ApiOperation({ summary: 'Get user privacy controls & settings' })
  @ApiResponse({ status: 200, type: PrivacySettingsDto })
  async getPrivacySettings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PrivacySettingsDto> {
    return this.usersService.getPrivacySettings(user.id);
  }

  @Patch('me/privacy')
  @ApiOperation({ summary: 'Update user privacy controls & settings' })
  @ApiResponse({ status: 200, type: PrivacySettingsDto })
  async updatePrivacySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePrivacyDto,
  ): Promise<PrivacySettingsDto> {
    return this.usersService.updatePrivacySettings(user.id, dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users by username or display name' })
  @ApiResponse({ status: 200, type: [SocialUserItemDto] })
  async searchUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() queryDto: SearchUsersQueryDto,
  ): Promise<SocialUserItemDto[]> {
    return this.usersService.searchUsers(
      user.id,
      queryDto.q || '',
      queryDto.limit,
    );
  }

  @Get('by-username/:username')
  @ApiOperation({ summary: 'Get public profile for a user by username' })
  @ApiResponse({ status: 200, type: PublicProfileDto })
  async getProfileByUsername(
    @CurrentUser() user: AuthenticatedUser,
    @Param('username') username: string,
  ): Promise<PublicProfileDto> {
    return this.usersService.getPublicProfile(user.id, username);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile for a user by ID' })
  @ApiResponse({ status: 200, type: PublicProfileDto })
  async getProfileById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PublicProfileDto> {
    return this.usersService.getPublicProfile(user.id, id);
  }
}
