import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ReportFiltersDto } from './report-filters.dto';

export class StatisticsFiltersDto extends ReportFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120) // Máximo 2 horas
  @Type(() => Number)
  targetTime?: number; // Tiempo objetivo en minutos
} 