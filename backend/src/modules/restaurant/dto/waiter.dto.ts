import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { WaiterShiftStatus } from '@prisma/client';

export class UpdateWaiterStatusDto {
  @ApiProperty({ enum: WaiterShiftStatus })
  @IsEnum(WaiterShiftStatus)
  status!: WaiterShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  currentVehicle?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  currentTableId?: string | null;
}

export class CreateWaiterProfileDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  branchId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  userId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  displayName!: string;
}
