import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiErrorDetailDto {
  @ApiProperty({ type: String, example: 'BAD_REQUEST' })
  code!: string;

  @ApiProperty({ type: String, example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({ example: ['email must be an email'] })
  details?: unknown;

  @ApiProperty({ type: String, example: 'req_12345' })
  requestId!: string;

  @ApiProperty({ type: String, example: '2026-08-14T19:00:00.000Z' })
  timestamp!: string;
}

export class ApiErrorEnvelopeDto {
  @ApiProperty({ type: ApiErrorDetailDto })
  error!: ApiErrorDetailDto;
}
