import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  CreateUploadIntentDto,
  UploadIntentResponseDto,
  MediaObjectDto,
} from './dto/upload-intent.dto';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('Media Platform & Storage')
@ApiBearerAuth('access-token')
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-intents')
  @ApiOperation({
    summary: 'Request a short-lived presigned upload URL for direct R2 PUT',
  })
  @ApiResponse({ status: 201, type: UploadIntentResponseDto })
  async createUploadIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUploadIntentDto,
  ): Promise<UploadIntentResponseDto> {
    return this.mediaService.createUploadIntent(user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalize and verify direct upload via HeadObject in R2',
  })
  @ApiResponse({ status: 200, type: MediaObjectDto })
  async completeUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
    @Body() dto: CompleteUploadDto,
  ): Promise<MediaObjectDto> {
    return this.mediaService.completeUpload(user.id, mediaId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete media object from storage and database' })
  @ApiResponse({ status: 200, type: SimpleMessageResponseDto })
  async deleteMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
  ): Promise<SimpleMessageResponseDto> {
    return this.mediaService.deleteMedia(user.id, mediaId);
  }
}
