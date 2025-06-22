import { IsOptional, IsDateString, IsNumber, IsEnum, IsString } from 'class-validator';

export enum ReportFormat {
  PDF = 'pdf'
}

export enum ReportPeriod {
  LAST_7_DAYS = 'last_7_days',
  LAST_MONTH = 'last_month',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

export class ReportFiltersDto {
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat;

  @IsOptional()
  @IsEnum(ReportPeriod)
  period?: ReportPeriod = ReportPeriod.LAST_MONTH;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  emergencyTypeId?: number;

  @IsOptional()
  @IsString()
  reportTitle?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsNumber()
  emergencyId?: number; // Para filtrar por una emergencia específica
} 