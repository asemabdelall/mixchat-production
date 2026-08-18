import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Res,
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
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserDto } from './dto/auth-response.dto';
import { SessionResponseDto } from './dto/session-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('Authentication & Sessions')
@Controller('auth')
@UseGuards(JwtAuthGuard, RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    const secure =
      this.configService.get<boolean>('cookie.secure') ?? isProduction;
    const sameSite =
      this.configService.get<'lax' | 'strict' | 'none'>('cookie.sameSite') ??
      (isProduction ? 'none' : 'lax');
    const domain = this.configService.get<string>('cookie.domain');
    const days =
      this.configService.get<number>('jwt.refreshExpirationDays') ?? 7;

    res.cookie('mixchat_refresh_token', token, {
      httpOnly: true,
      secure,
      sameSite,
      domain: domain || undefined,
      path: '/',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProduction =
      this.configService.get<string>('nodeEnv') === 'production';
    const secure =
      this.configService.get<boolean>('cookie.secure') ?? isProduction;
    const sameSite =
      this.configService.get<'lax' | 'strict' | 'none'>('cookie.sameSite') ??
      (isProduction ? 'none' : 'lax');
    const domain = this.configService.get<string>('cookie.domain');

    res.clearCookie('mixchat_refresh_token', {
      httpOnly: true,
      secure,
      sameSite,
      domain: domain || undefined,
      path: '/',
    });
  }

  @Public()
  @Post('register')
  @RateLimit('AUTH_REGISTER', 5, 900)
  @ApiOperation({ summary: 'Register a new user account atomically' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.register(dto, ip, userAgent);
    this.setRefreshCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('login')
  @RateLimit('AUTH_LOGIN', 10, 900)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email/username and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);
    this.setRefreshCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Public()
  @Post('refresh')
  @RateLimit('AUTH_REFRESH', 60, 900)
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('mixchat_refresh_token')
  @ApiOperation({
    summary:
      'Rotate refresh token via HttpOnly cookie and issue new access token',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or reused refresh token',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const rawRefreshToken =
      (req.cookies?.['mixchat_refresh_token'] as string) || '';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];

    try {
      const result = await this.authService.refresh(
        rawRefreshToken,
        ip,
        userAgent,
      );
      this.setRefreshCookie(res, result.refreshToken);

      return {
        user: result.user,
        accessToken: result.accessToken,
      };
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @RateLimit('AUTH_LOGOUT', 60, 900)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out current session and clear refresh cookie' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const rawRefreshToken =
      (req.cookies?.['mixchat_refresh_token'] as string) || '';
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    await this.authService.logout(rawRefreshToken, undefined, ip);
    this.clearRefreshCookie(res);

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Log out of all active sessions across all devices',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
  })
  async logoutAll(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    await this.authService.logoutAll(user.id, ip);
    this.clearRefreshCookie(res);

    return { success: true, message: 'All sessions revoked successfully' };
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserDto })
  getMe(@CurrentUser() user: AuthenticatedUser): UserDto {
    const { sessionId, ...userDto } = user;
    void sessionId;
    return userDto;
  }

  @Get('sessions')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List active sessions for current user' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  async getSessions(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto[]> {
    return this.authService.getSessions(user.id, user.sessionId);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a specific device session' })
  @ApiResponse({ status: 200, description: 'Session revoked successfully' })
  async revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.revokeSession(user.id, sessionId);
    return { success: true, message: 'Session revoked successfully' };
  }
}
