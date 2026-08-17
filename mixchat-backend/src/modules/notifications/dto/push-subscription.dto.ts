import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PushSubscriptionKeysDto {
  @ApiProperty({ description: 'P256DH public key for payload encryption' })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @ApiProperty({ description: 'Auth secret for payload authentication' })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}

export class RegisterPushSubscriptionDto {
  @ApiProperty({ description: 'Browser Push Service Endpoint URL' })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;

  @ApiProperty({ type: PushSubscriptionKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PushSubscriptionKeysDto)
  keys!: PushSubscriptionKeysDto;

  @ApiPropertyOptional({ description: 'Client User-Agent' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Client Device description or label' })
  @IsOptional()
  @IsString()
  deviceLabel?: string;
}

export class UnregisterPushSubscriptionDto {
  @ApiProperty({ description: 'Browser Push Service Endpoint URL to revoke' })
  @IsString()
  @IsNotEmpty()
  endpoint!: string;
}

export class VapidPublicKeyResponseDto {
  @ApiProperty({
    description: 'VAPID Application Server Public Key (Base64 URL Safe)',
  })
  @IsString()
  publicKey!: string;
}

export class NotificationPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  pushEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  socialPush!: boolean;

  @ApiProperty()
  @IsBoolean()
  likesPush!: boolean;

  @ApiProperty()
  @IsBoolean()
  commentsPush!: boolean;

  @ApiProperty()
  @IsBoolean()
  mentionsPush!: boolean;

  @ApiProperty()
  @IsBoolean()
  messagesPush!: boolean;

  @ApiProperty()
  @IsBoolean()
  showMessagePreview!: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  socialPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  likesPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  commentsPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mentionsPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  messagesPush?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showMessagePreview?: boolean;
}
