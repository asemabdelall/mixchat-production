import {
  Controller,
  Post,
  Get,
  Body,
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
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportReceiptDto } from './dto/report-response.dto';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';

@ApiTags('Safety & Reporting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RateLimitGuard)
@Controller('safety/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit('REPORT_SUBMIT', 10, 900) // 10 reports per 15 mins
  @ApiOperation({
    summary: 'Submit unified safety report',
    description:
      'Report a user, post, comment, story, reel, message, or anonymous session for moderation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Report received and queued for review.',
    type: ReportReceiptDto,
  })
  async submitReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ): Promise<ReportReceiptDto> {
    return this.reportsService.createReport(userId, dto);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List reports submitted by current user',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    type: [ReportReceiptDto],
  })
  async getMyReports(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ): Promise<ReportReceiptDto[]> {
    return this.reportsService.getMyReports(userId, limit ? Number(limit) : 20);
  }
}
