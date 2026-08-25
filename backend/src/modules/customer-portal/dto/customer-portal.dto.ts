import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitFeedbackDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  queueEntryId!: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class UpdateEntryContactDto {
  @ApiProperty({
    description: 'Guest phone in E.164-ish form (digits, optional leading +)',
    example: '+923001234567',
  })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'phone must be 7–15 digits with an optional leading +',
  })
  phone!: string;

  @ApiPropertyOptional({
    description: 'Optional Socket.IO tracking token issued at join/tracking',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  trackingToken?: string;
}
