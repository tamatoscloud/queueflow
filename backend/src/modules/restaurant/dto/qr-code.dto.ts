import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QRCodePurpose } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateQrCodeDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  branchId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  queueId?: string;

  @ApiProperty({ enum: QRCodePurpose })
  @IsEnum(QRCodePurpose)
  purpose!: QRCodePurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  assignedUserId?: string;
}

export class UpdateQrCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ResolveQrCodeResponseDto {
  @ApiProperty()
  code!: string;

  @ApiProperty()
  targetUrl!: string;

  @ApiProperty({ enum: QRCodePurpose })
  purpose!: QRCodePurpose;

  @ApiPropertyOptional()
  queueId?: string | null;

  @ApiPropertyOptional()
  branchId?: string | null;
}
