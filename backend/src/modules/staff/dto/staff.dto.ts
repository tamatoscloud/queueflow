import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class InviteStaffDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Display name used when the invite is accepted' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((o: InviteStaffDto) => !o.roleName)
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional({
    description: 'System role name (MANAGER, RECEPTIONIST, STAFF, VIEWER)',
    example: 'RECEPTIONIST',
  })
  @ValidateIf((o: InviteStaffDto) => !o.roleId)
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangeStaffRoleDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((o: ChangeStaffRoleDto) => !o.roleName)
  @IsUUID('4')
  roleId?: string;

  @ApiPropertyOptional()
  @ValidateIf((o: ChangeStaffRoleDto) => !o.roleId)
  @IsString()
  roleName?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;
}

export class AssignBranchesDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  businessId?: string;

  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  branchIds!: string[];

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  primaryBranchId?: string;
}
