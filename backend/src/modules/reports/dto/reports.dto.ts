import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DailySummaryQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  businessId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  queueId?: string;

  @ApiPropertyOptional({
    description: 'ISO date (YYYY-MM-DD). Defaults to today (UTC).',
    example: '2026-07-22',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class QueueReportParamsDto {
  @ApiProperty({ format: 'uuid' })
  queueId!: string;
}
