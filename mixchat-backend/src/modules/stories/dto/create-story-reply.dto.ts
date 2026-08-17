import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStoryReplyDto {
  @ApiProperty({
    description: 'Plain text reply message to the story (max 1000 characters)',
    example: 'This view is incredible! 🤩',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;
}
