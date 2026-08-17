import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { StoryReactionType } from '@prisma/client';

export class ReactStoryDto {
  @ApiProperty({
    description: 'Reaction emoji type to associate with the story',
    enum: StoryReactionType,
    example: StoryReactionType.HEART,
  })
  @IsEnum(StoryReactionType)
  @IsNotEmpty()
  reaction: StoryReactionType;
}
