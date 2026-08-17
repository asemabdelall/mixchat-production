import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportReason, ReportStatus, ReportTargetType } from '@prisma/client';

export class ReportReceiptDto {
  @ApiProperty({
    example: 'rep_12345678',
    description: 'Unique report identifier',
  })
  id!: string;

  @ApiProperty({
    enum: ReportTargetType,
    example: ReportTargetType.POST,
  })
  targetType!: ReportTargetType;

  @ApiProperty({
    example: 'post_98765432',
  })
  targetId!: string;

  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.HARASSMENT,
  })
  reason!: ReportReason;

  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.OPEN,
  })
  status!: ReportStatus;

  @ApiProperty({
    example: '2026-08-16T02:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    example:
      'Thank you for helping keep MixChat safe. Our trust & safety team will review this report.',
  })
  message!: string;
}

export class AdminReportDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reporterId!: string;

  @ApiProperty()
  reportedUserId!: string;

  @ApiProperty({ enum: ReportTargetType })
  targetType!: ReportTargetType;

  @ApiProperty()
  targetId!: string;

  @ApiProperty({ enum: ReportReason })
  reason!: ReportReason;

  @ApiPropertyOptional()
  details?: string;

  @ApiProperty({ enum: ReportStatus })
  status!: ReportStatus;

  @ApiProperty()
  priority!: number;

  @ApiPropertyOptional()
  snapshot?: Record<string, unknown>;

  @ApiPropertyOptional()
  resolvedAt?: string;

  @ApiPropertyOptional()
  resolvedById?: string;

  @ApiPropertyOptional()
  resolutionNotes?: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class PaginatedAdminReportsDto {
  @ApiProperty({ type: [AdminReportDetailDto] })
  items!: AdminReportDetailDto[];

  @ApiPropertyOptional()
  nextCursor?: string | null;

  @ApiProperty()
  hasMore!: boolean;

  @ApiProperty()
  totalCount!: number;
}
