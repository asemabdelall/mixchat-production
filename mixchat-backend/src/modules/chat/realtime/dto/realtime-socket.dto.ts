import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'class-validator';
import {
  SendMessageDto,
  MarkConversationReadDto,
} from '../../dto/chat-request.dto';

export class JoinConversationDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId!: string;
}

export class LeaveConversationDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId!: string;
}

export class TypingDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId!: string;
}

export class PresenceGetDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsUUID('4', { each: true })
  userIds!: string[];
}

export class SendMessageSocketDto extends SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId!: string;
}

export class MarkReadSocketDto extends MarkConversationReadDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId!: string;
}
