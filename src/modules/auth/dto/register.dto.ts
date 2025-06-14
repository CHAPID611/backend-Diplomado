import { IsEmail, IsString, MinLength, IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Email del usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Nombre de la persona' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Apellido de la persona' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'IDs de los roles a asignar', type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds?: number[];
} 