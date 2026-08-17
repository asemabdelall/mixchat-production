import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminModerationService } from './admin-moderation.service';
import {
  AdminReportDetailDto,
  PaginatedAdminReportsDto,
} from './dto/report-response.dto';
import {
  ExecuteModerationActionDto,
  ModerationActionResponseDto,
} from './dto/moderation-action.dto';
import { ReportStatus, ReportTargetType, UserRole } from '@prisma/client';

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly moderationService: AdminModerationService) {}

  @Get('reports')
  @ApiOperation({
    summary: 'List reports in moderation queue',
    description:
      'Retrieve cursor-paginated reports with optional status and targetType filters.',
  })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiQuery({ name: 'targetType', enum: ReportTargetType, required: false })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: PaginatedAdminReportsDto })
  async getReports(
    @Query('status') status?: ReportStatus,
    @Query('targetType') targetType?: ReportTargetType,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ): Promise<PaginatedAdminReportsDto> {
    return this.moderationService.getReports({
      status,
      targetType,
      cursor,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get('reports/:id')
  @ApiOperation({
    summary: 'Get report details with evidence snapshot',
  })
  @ApiResponse({ status: 200, type: AdminReportDetailDto })
  async getReportById(
    @Param('id') reportId: string,
  ): Promise<AdminReportDetailDto> {
    return this.moderationService.getReportById(reportId);
  }

  @Post('reports/:id/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Execute moderation action on report',
    description:
      'Atomically apply moderation action (REMOVE_CONTENT, SUSPEND_USER, DISABLE_USER, DISMISS_REPORT, WARN_USER).',
  })
  @ApiResponse({ status: 200, type: ModerationActionResponseDto })
  async executeAction(
    @CurrentUser('id') moderatorId: string,
    @Param('id') reportId: string,
    @Body() dto: ExecuteModerationActionDto,
  ): Promise<ModerationActionResponseDto> {
    return this.moderationService.executeAction(moderatorId, reportId, dto);
  }
}
