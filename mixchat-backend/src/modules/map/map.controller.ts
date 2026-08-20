import {
  Controller,
  Get,
  Patch,
  Put,
  Delete,
  Post,
  Body,
  UseGuards,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MapService } from './map.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';
import { PlacesService } from './places.service';
import {
  PlaceSuggestionDto,
  ReverseGeocodeDto,
} from './dto/reverse-geocode.dto';
import {
  LocationSettingsResponseDto,
  MapFriendsResponseDto,
  LocationUpdateResponseDto,
  LocationDeleteResponseDto,
} from './dto/location-response.dto';

@ApiTags('map')
@Controller('map')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class MapController {
  constructor(
    private readonly mapService: MapService,
    private readonly placesService: PlacesService,
  ) {}

  @Post('places/reverse')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Resolve the user-selected coordinates to a nearby place',
    description:
      'User-triggered reverse geocoding with server-side rate limiting and caching. Coordinates are not persisted.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Nearest place label',
    type: PlaceSuggestionDto,
  })
  async reverseGeocode(
    @Body() dto: ReverseGeocodeDto,
  ): Promise<PlaceSuggestionDto> {
    return this.placesService.reverseGeocode(dto);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Get location sharing & privacy settings',
    description:
      'Returns durable location privacy preferences for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location settings retrieved successfully',
    type: LocationSettingsResponseDto,
  })
  async getSettings(
    @CurrentUser('id') userId: string,
  ): Promise<LocationSettingsResponseDto> {
    return this.mapService.getSettings(userId);
  }

  @Patch('settings')
  @ApiOperation({
    summary: 'Update location sharing & privacy settings',
    description:
      'Update Ghost Mode toggle or audience visibility. Entering Ghost Mode immediately deletes live coordinates from Redis.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location settings updated successfully',
    type: LocationSettingsResponseDto,
  })
  async updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationSettingsDto,
  ): Promise<LocationSettingsResponseDto> {
    return this.mapService.updateSettings(userId, dto);
  }

  @Put('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update live location coordinates',
    description:
      'Stores ephemeral coordinates in Redis with an atomic TTL (10 minutes). If Ghost Mode is active, coordinates are discarded.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location update processed',
    type: LocationUpdateResponseDto,
  })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ): Promise<LocationUpdateResponseDto> {
    return this.mapService.updateLocation(userId, dto);
  }

  @Delete('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Explicitly stop sharing and delete live location',
    description:
      'Deletes the ephemeral coordinates from Redis immediately and notifies authorized viewers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location removed from Redis',
    type: LocationDeleteResponseDto,
  })
  async deleteLocation(
    @CurrentUser('id') userId: string,
  ): Promise<LocationDeleteResponseDto> {
    return this.mapService.deleteLocation(userId);
  }

  @Get('friends')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary: 'Get authorized friends sharing live locations on map',
    description:
      'Returns active, non-expired locations of friends authorized by LocationVisibilityPolicy.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorized friend locations list',
    type: MapFriendsResponseDto,
  })
  async getFriendsLocations(
    @CurrentUser('id') viewerId: string,
  ): Promise<MapFriendsResponseDto> {
    return this.mapService.getFriendsLocations(viewerId);
  }
}
