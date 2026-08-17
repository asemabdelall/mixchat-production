import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  UniversalSearchQueryDto,
  ExploreQueryDto,
} from './dto/search-query.dto';
import {
  UniversalSearchResponseDto,
  ExploreFeedResponseDto,
} from './dto/search-response.dto';
import { TrendingResponseDto } from './dto/trending-response.dto';
import {
  AddRecentSearchDto,
  RecentSearchesResponseDto,
} from './dto/recent-search.dto';
import { SimpleMessageResponseDto } from '../social/dto/social-action-response.dto';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('universal')
  @ApiOperation({
    summary:
      'Universal multi-entity search across users, posts, hashtags, and media',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranked search results across requested domains',
    type: UniversalSearchResponseDto,
  })
  async universalSearch(
    @CurrentUser('id') viewerId: string,
    @Query() queryDto: UniversalSearchQueryDto,
  ): Promise<UniversalSearchResponseDto> {
    return await this.searchService.universalSearch(queryDto, viewerId);
  }

  @Get('trending')
  @ApiOperation({
    summary:
      'Get dynamic trending hashtags and hot topics computed from real post velocity',
  })
  @ApiResponse({
    status: 200,
    description: 'Dynamic trending topics with velocity scoring',
    type: TrendingResponseDto,
  })
  async getTrending(): Promise<TrendingResponseDto> {
    return await this.searchService.getTrendingTopics();
  }

  @Get('explore')
  @ApiOperation({
    summary:
      'Algorithmic visual explore feed of high-engagement public posts and carousels',
  })
  @ApiResponse({
    status: 200,
    description: 'Explore discovery feed with cursor pagination',
    type: ExploreFeedResponseDto,
  })
  async getExploreFeed(
    @CurrentUser('id') viewerId: string,
    @Query() queryDto: ExploreQueryDto,
  ): Promise<ExploreFeedResponseDto> {
    return await this.searchService.getExploreFeed(viewerId, queryDto);
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get user recent search history',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent search queries',
    type: RecentSearchesResponseDto,
  })
  async getRecentSearches(
    @CurrentUser('id') userId: string,
  ): Promise<RecentSearchesResponseDto> {
    const items = await this.searchService.getRecentSearches(userId);
    return { items };
  }

  @Post('recent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a search term to recent history',
  })
  @ApiResponse({
    status: 200,
    description: 'Term recorded to search history',
    type: SimpleMessageResponseDto,
  })
  async addRecentSearch(
    @CurrentUser('id') userId: string,
    @Body() dto: AddRecentSearchDto,
  ): Promise<SimpleMessageResponseDto> {
    await this.searchService.addRecentSearch(userId, dto.term);
    return { message: 'Search term added to history' };
  }

  @Delete('recent')
  @ApiOperation({
    summary: 'Clear all recent search history',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent search history cleared',
    type: SimpleMessageResponseDto,
  })
  async clearRecentSearches(
    @CurrentUser('id') userId: string,
  ): Promise<SimpleMessageResponseDto> {
    await this.searchService.clearRecentSearches(userId);
    return { message: 'Search history cleared' };
  }

  @Delete('recent/:term')
  @ApiOperation({
    summary: 'Delete a single search term from recent history',
  })
  @ApiParam({ name: 'term', description: 'Search term to remove' })
  @ApiResponse({
    status: 200,
    description: 'Term removed from history',
    type: SimpleMessageResponseDto,
  })
  async deleteRecentSearch(
    @CurrentUser('id') userId: string,
    @Param('term') term: string,
  ): Promise<SimpleMessageResponseDto> {
    await this.searchService.deleteRecentSearch(
      userId,
      decodeURIComponent(term),
    );
    return { message: 'Search term removed' };
  }
}
