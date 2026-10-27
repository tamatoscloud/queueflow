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
  ValidateNested,
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

  @ApiProperty({
    description: 'Tracking token issued at join; required to act for the guest',
  })
  @IsOptional() // missing token → 403 from the service, not a generic 400
  @IsString()
  @MaxLength(512)
  trackingToken?: string;
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

  @ApiProperty({
    description: 'Tracking token issued at join; required to act for the guest',
  })
  @IsOptional() // missing token → 403 from the service, not a generic 400
  @IsString()
  @MaxLength(512)
  trackingToken?: string;
}

export class WebPushKeysDto {
  @IsString()
  @MaxLength(512)
  p256dh!: string;

  @IsString()
  @MaxLength(512)
  auth!: string;
}

export class SubscribeWebPushDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  entryId!: string;

  @IsString()
  @MaxLength(2048)
  endpoint!: string;

  @Type(() => WebPushKeysDto)
  @ValidateNested()
  keys!: WebPushKeysDto;

  @ApiProperty({
    description: 'Tracking token issued at join; required to act for the guest',
  })
  @IsOptional() // missing token → 403 from the service, not a generic 400
  @IsString()
  @MaxLength(512)
  trackingToken?: string;
}
