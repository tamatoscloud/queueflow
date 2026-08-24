import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CustomerLookupQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional — resolved from staff JWT when omitted',
  })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiPropertyOptional({ example: '+923001111111' })
  @IsOptional()
  @IsString()
  phone?: string;

  /** Name, phone, or ticket/display code — preferred over `phone`. */
  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  q?: string;
}

export class CustomerListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiPropertyOptional({ description: 'Filter by name, phone digits, or ticket code' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @ApiPropertyOptional({
    description: 'When true (default), only guests with an active queue entry',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  activeOnly?: boolean;
}

export class CustomerHistoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;
}

export class GetCustomerQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional — resolved from staff JWT when omitted',
  })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;
}
