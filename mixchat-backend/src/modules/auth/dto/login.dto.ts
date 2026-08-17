import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'alex@mixchat.app',
    description: 'Email address or username of account',
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  @Transform(({ value }: { value: string }) => value?.trim())
  identifier!: string;

  @ApiProperty({ example: 'SuperSecret123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
