import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationPreference } from '../../../queue-engine';

export class JoinQueueDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+923001111111' })
  @IsString()
  phone!: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Structured entry metadata (takeaway order, drive-in vehicle, etc.)',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiProperty({ enum: NotificationPreference })
  @IsEnum(NotificationPreference)
  notificationPreference!: NotificationPreference;
}

/** Staff walk-in — same fields as join but always uses WALK_IN source. */
export class WalkInCustomerDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+923001111111' })
  @IsString()
  phone!: string;

  @ApiProperty({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  partySize!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: NotificationPreference })
  @IsEnum(NotificationPreference)
  notificationPreference!: NotificationPreference;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  bypassOperatingHours?: boolean;
}

export class MoveCustomerDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  beforeEntryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  afterEntryId?: string;
}

export class TransferCustomerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  targetQueueId!: string;
}

export class PromotePriorityDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priority!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}

export class MarkNoShowDto {
  @ApiPropertyOptional({
    description: 'Skip timeout check (staff force)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
