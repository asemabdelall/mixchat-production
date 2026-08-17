import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ModerationActionType } from '@prisma/client';

export class ExecuteModerationActionDto {
  @ApiProperty({
    enum: ModerationActionType,
    example: ModerationActionType.REMOVE_CONTENT,
    description: 'Moderation action to execute',
  })
  @IsEnum(ModerationActionType)
  @IsNotEmpty()
  action!: ModerationActionType;

  @ApiPropertyOptional({
    example: 'Violated Community Guidelines against harassment',
    description: 'Internal rationale or public notice note',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    example: 86400,
    description:
      'Duration in seconds for temporary suspension (if action=SUSPEND_USER)',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(31536000)
  suspensionDurationSeconds?: number;

  @ApiPropertyOptional({
    example: 'Resolved during routine queue triage.',
    description: 'Resolution notes for the report record',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNotes?: string;
}

export class ModerationActionResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    example: 'Action executed successfully and recorded in audit log.',
  })
  message!: string;

  @ApiPropertyOptional({ example: 'rep_123456' })
  reportId?: string;

  @ApiProperty({ enum: ModerationActionType })
  action!: ModerationActionType;

  @ApiProperty({ example: '2026-08-16T02:35:00.000Z' })
  executedAt!: string;
}
