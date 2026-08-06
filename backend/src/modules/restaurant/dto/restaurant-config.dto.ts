import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import { BusinessType, ServiceMode } from '@prisma/client';

export class UpdateRestaurantConfigDto {
  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @ApiPropertyOptional({ enum: ServiceMode, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ServiceMode, { each: true })
  enabledModes?: ServiceMode[];
}

export class RestaurantConfigResponseDto {
  @ApiProperty({ enum: BusinessType })
  businessType!: BusinessType;

  @ApiProperty({ enum: ServiceMode, isArray: true })
  enabledModes!: ServiceMode[];
}
