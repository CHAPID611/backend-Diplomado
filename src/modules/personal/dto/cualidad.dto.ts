import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CualidadDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsString()
  categoria: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
} 