import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class UpdateEmergencyDto {
  @IsOptional()
  @IsDateString()
  emergencyDate?: string;

  @IsOptional()
  @IsString()
  informant?: string;

  @IsOptional()
  @IsString()
  vehicle?: string;

  @IsOptional()
  @IsString()
  ubication?: string;

  @IsOptional()
  @IsString()
  turn?: string;

  @IsOptional()
  @IsDateString()
  reportTime?: string;

  @IsOptional()
  @IsString()
  reportTimeDescription?: string;

  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @IsOptional()
  @IsString()
  departureTimeDescription?: string;

  @IsOptional()
  @IsDateString()
  arrivalSceneTime?: string;

  @IsOptional()
  @IsString()
  arrivalSceneTimeDescription?: string;

  @IsOptional()
  @IsDateString()
  arrivalHospitalTime?: string;

  @IsOptional()
  @IsString()
  arrivalHospitalTimeDescription?: string;

  @IsOptional()
  @IsDateString()
  returnEstationTime?: string;

  @IsOptional()
  @IsString()
  returnEstationTimeDescription?: string;

  @IsOptional()
  @IsString()
  unitsResponse?: string;

  @IsOptional()
  @IsString()
  guardPersonnel?: string;

  @IsOptional()
  @IsNumber()
  emergencyType?: number;
} 