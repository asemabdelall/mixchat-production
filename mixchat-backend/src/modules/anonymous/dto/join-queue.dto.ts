import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';

export class JoinQueueDto {
  @ApiPropertyOptional({
    description:
      'Selected interest tags for matchmaking (e.g. Technology, Gaming, Music)',
    example: ['Technology', 'Gaming'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @MaxLength(30, { each: true })
  interests?: string[];
}
