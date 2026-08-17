import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ReportReason, ReportTargetType } from '@prisma/client';

export class CreateReportDto {
  @ApiProperty({
    enum: ReportTargetType,
    example: ReportTargetType.POST,
    description: 'Type of entity being reported',
  })
  @IsEnum(ReportTargetType)
  @IsNotEmpty()
  targetType!: ReportTargetType;

  @ApiProperty({
    example: 'd9b2d63d-a233-4123-8511-abcdef123456',
    description: 'Unique identifier of the reported entity',
  })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.SPAM,
    description: 'Categorized safety reason for reporting',
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason!: ReportReason;

  @ApiPropertyOptional({
    example: 'This post is promoting fraudulent investment links.',
    description: 'Optional user-provided context (max 1000 characters)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
