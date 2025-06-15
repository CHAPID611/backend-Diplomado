import { IsOptional, IsString, IsDateString, IsNumber, IsEnum, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum PeriodFilter {
  LAST_7_DAYS = 'last_7_days',
  LAST_MONTH = 'last_month',
  LAST_3_MONTHS = 'last_3_months',
  LAST_6_MONTHS = 'last_6_months',
  LAST_YEAR = 'last_year',
  CUSTOM = 'custom'
}

export class QueryEmergencyDto {
  @IsEnum(PeriodFilter)
  period: PeriodFilter;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  emergencyTypeId?: number;

  @IsOptional()
  @IsString()
  ubication?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
} 