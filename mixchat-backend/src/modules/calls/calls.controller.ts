import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CreateCallDto } from './dto/create-call.dto';
import { CallResponseDto } from './dto/call-response.dto';
import { CallTokenResponseDto } from './dto/call-token-response.dto';
import { CallHistoryQueryDto } from './dto/call-history-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('calls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a new voice or video call' })
  @ApiResponse({ status: 201, type: CallResponseDto })
  async initiateCall(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCallDto,
  ): Promise<CallResponseDto> {
    return this.callsService.initiateCall(userId, dto);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get current active or ringing call for session restoration',
  })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async getCurrentCall(
    @CurrentUser('id') userId: string,
  ): Promise<CallResponseDto | null> {
    return this.callsService.getCurrentCall(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get cursor-paginated call history' })
  @ApiResponse({ status: 200 })
  async getCallHistory(
    @CurrentUser('id') userId: string,
    @Query() query: CallHistoryQueryDto,
  ): Promise<{ calls: CallResponseDto[]; nextCursor: string | null }> {
    return this.callsService.getCallHistory(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific call' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async getCallById(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallResponseDto> {
    return this.callsService.getCallById(userId, callId);
  }

  @Post(':id/token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request fresh LiveKit connection token for an active call',
  })
  @ApiResponse({ status: 200, type: CallTokenResponseDto })
  async getCallToken(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallTokenResponseDto> {
    return this.callsService.getCallToken(userId, callId);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an incoming call' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async acceptCall(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallResponseDto> {
    return this.callsService.acceptCall(userId, callId);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline an incoming call' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async declineCall(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallResponseDto> {
    return this.callsService.declineCall(userId, callId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an outgoing ringing call' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async cancelCall(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallResponseDto> {
    return this.callsService.cancelCall(userId, callId);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End an active call' })
  @ApiResponse({ status: 200, type: CallResponseDto })
  async endCall(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) callId: string,
  ): Promise<CallResponseDto> {
    return this.callsService.endCall(userId, callId);
  }
}
