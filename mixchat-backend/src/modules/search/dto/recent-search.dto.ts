import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddRecentSearchDto {
  @ApiProperty({ type: String, example: 'cyberpunk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  term!: string;
}

export class RecentSearchesResponseDto {
  @ApiProperty({ type: [String], example: ['cyberpunk', 'alex', '#design'] })
  items!: string[];
}
