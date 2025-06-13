import { IsEmail, IsString, MinLength, IsArray, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  nombre: string;

  @IsString()
  apellido: string;

  @IsArray()
  @IsOptional()
  roleIds?: number[];
} 