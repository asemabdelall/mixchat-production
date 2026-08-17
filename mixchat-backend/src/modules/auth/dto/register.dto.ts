import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    example: 'alex@mixchat.app',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  email!: string;

  @ApiProperty({
    example: 'alex_creator',
    description: 'Unique username (3-30 alphanumeric + underscore characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message:
      'Username must be 3-30 characters, alphanumeric and underscore only',
  })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  username!: string;

  @ApiProperty({
    example: 'SuperSecret123!',
    description: 'Account password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  password!: string;
}
