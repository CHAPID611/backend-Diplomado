import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateSystemConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTargetTimeDto {
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(1, { message: 'El tiempo objetivo debe ser mayor a 0' })
  targetTime: number;

  @IsOptional()
  @IsString()
  description?: string;
} 