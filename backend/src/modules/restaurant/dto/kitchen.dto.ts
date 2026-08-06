import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { KitchenOrderStage } from '@prisma/client';

export class UpdateKitchenOrderDto {
  @ApiProperty({ enum: KitchenOrderStage })
  @IsEnum(KitchenOrderStage)
  stage!: KitchenOrderStage;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  assignedWaiterId?: string | null;
}

export class CreateKitchenOrderDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  entryId!: string;

  @ApiProperty()
  orderNumber!: string;
}
