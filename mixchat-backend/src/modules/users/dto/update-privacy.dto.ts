import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class UpdatePrivacyDto {
  @ApiPropertyOptional({
    example: 'Everyone',
    enum: ['Everyone', 'My Contacts', 'Nobody'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Everyone', 'My Contacts', 'Nobody'])
  lastSeen?: string;

  @ApiPropertyOptional({
    example: 'Everyone',
    enum: ['Everyone', 'My Contacts', 'Nobody'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Everyone', 'My Contacts', 'Nobody'])
  profilePhoto?: string;

  @ApiPropertyOptional({ example: 'exact', enum: ['exact', 'approx', 'ghost'] })
  @IsOptional()
  @IsString()
  @IsIn(['exact', 'approx', 'ghost'])
  locationMode?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  readReceipts?: boolean;

  @ApiPropertyOptional({
    example: 'Everyone',
    enum: ['Everyone', 'Following', 'Nobody'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Everyone', 'Following', 'Nobody'])
  allowMentions?: string;

  @ApiPropertyOptional({
    example: 'Everyone',
    enum: ['Everyone', 'Following', 'Nobody'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['Everyone', 'Following', 'Nobody'])
  allowDirectMessages?: string;
}
