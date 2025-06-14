import { IsEmail, IsOptional, IsString, MinLength, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: 'Email del usuario', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Contraseña del usuario', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: 'Nombre de la persona', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Apellido de la persona', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ description: 'IDs de los roles a asignar', required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds?: number[];
} 