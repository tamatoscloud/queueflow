import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CustomerLookupQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  businessId!: string;

  @ApiProperty({ example: '+923001111111' })
  @IsString()
  phone!: string;
}

export class CustomerHistoryQueryDto extends PaginationQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  businessId!: string;
}

export class GetCustomerQueryDto {
  @ApiProperty({ format: 'uuid', description: 'Tenant scope — required for isolation' })
  @IsUUID('4')
  businessId!: string;
}
