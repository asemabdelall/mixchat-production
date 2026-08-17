import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import {
  ChatPageQueryDto,
  CreateConversationDto,
  GroupMemberDto,
  MarkConversationReadDto,
  SendMessageDto,
  UpdateConversationStateDto,
  UpdateGroupDto,
  UpdateMessageDto,
} from './dto/chat-request.dto';
import {
  ConversationSummaryDto,
  MessageResponseDto,
  PaginatedConversationsDto,
  PaginatedMessagesDto,
  ReadStateDto,
} from './dto/chat-response.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({
    summary: 'Create or recover a direct conversation, or create a group',
  })
  @ApiResponse({ status: 201, type: ConversationSummaryDto })
  createConversation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'List current user conversations by latest activity',
  })
  @ApiResponse({ status: 200, type: PaginatedConversationsDto })
  listConversations(
    @CurrentUser('id') userId: string,
    @Query() query: ChatPageQueryDto,
  ) {
    return this.chatService.listConversations(userId, query);
  }

  @Get('conversations/:id')
  @ApiResponse({ status: 200, type: ConversationSummaryDto })
  getConversation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chatService.getConversation(userId, id);
  }

  @Patch('conversations/:id/state')
  @ApiResponse({ status: 200, type: ConversationSummaryDto })
  updateState(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationStateDto,
  ) {
    return this.chatService.updateState(userId, id, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Load the latest or next older page of messages' })
  @ApiResponse({ status: 200, type: PaginatedMessagesDto })
  listMessages(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query() query: ChatPageQueryDto,
  ) {
    return this.chatService.listMessages(userId, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Persist a message through the canonical messaging pipeline',
  })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Advance durable read state monotonically' })
  @ApiResponse({ status: 200, type: ReadStateDto })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: MarkConversationReadDto,
  ) {
    return this.chatService.markRead(userId, id, dto);
  }

  @Patch('messages/:id')
  @ApiResponse({ status: 200, type: MessageResponseDto })
  editMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.chatService.editMessage(userId, id, dto);
  }

  @Delete('messages/:id')
  @ApiResponse({ status: 200, type: MessageResponseDto })
  deleteMessage(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chatService.deleteMessage(userId, id);
  }

  @Patch('conversations/:id/group')
  @ApiResponse({ status: 200, type: ConversationSummaryDto })
  updateGroup(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroup(userId, id, dto);
  }

  @Post('conversations/:id/members')
  @ApiResponse({ status: 201, type: ConversationSummaryDto })
  addMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: GroupMemberDto,
  ) {
    return this.chatService.addGroupMember(userId, id, dto);
  }

  @Delete('conversations/:id/members/:memberId')
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.chatService.removeGroupMember(userId, id, memberId);
  }

  @Delete('conversations/:id/leave')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  leaveGroup(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chatService.leaveGroup(userId, id);
  }
}
