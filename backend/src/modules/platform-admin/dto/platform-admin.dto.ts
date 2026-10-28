import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { BusinessStatusDto } from '../../business/dto/business.dto';

export class PlatformAuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class PlatformUserQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
}

export class UpdatePlatformUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] })
  @IsIn(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
  status!: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
}

export const SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const;

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SUBSCRIPTION_STATUSES })
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  status?: (typeof SUBSCRIPTION_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  currentPeriodEnd?: string;
}

export class CreateSupportTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  description!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  businessId?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export class UpdateSupportTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const)
  status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}

export class UpdateGlobalFeatureFlagsDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  featureFlags!: Record<string, unknown>;
}

export class UpdateBusinessFeatureFlagsDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  featureFlags!: Record<string, unknown>;
}

export class PlatformBusinessUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: BusinessStatusDto })
  @IsOptional()
  @IsEnum(BusinessStatusDto)
  status?: BusinessStatusDto;
}

export class AnalyticsRangeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
