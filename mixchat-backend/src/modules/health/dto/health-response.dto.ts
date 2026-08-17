import { ApiProperty } from '@nestjs/swagger';

export class LivenessResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: string;

  @ApiProperty({ type: Number, example: 12.34 })
  uptime!: number;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  timestamp!: string;
}

export class ReadinessDependenciesDto {
  @ApiProperty({ type: Boolean, example: true })
  database!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  redis!: boolean;
}

export class ReadinessResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: string;

  @ApiProperty({ type: String, example: '2026-08-14T18:30:00.000Z' })
  timestamp!: string;

  @ApiProperty({ type: ReadinessDependenciesDto })
  dependencies!: ReadinessDependenciesDto;
}
