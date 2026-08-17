import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { CallType } from '@prisma/client';

export class CreateCallDto {
  @ApiProperty({
    description: 'Conversation UUID for 1-to-1 or group call',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  conversationId!: string;

  @ApiProperty({
    description: 'Type of call: VOICE or VIDEO',
    enum: CallType,
    example: 'VOICE',
  })
  @IsEnum(CallType)
  @IsNotEmpty()
  type!: CallType;
}
