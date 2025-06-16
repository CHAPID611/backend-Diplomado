import { IsString, IsOptional, IsNumber, IsDateString, IsNotEmpty } from 'class-validator';

export class EditEmergencyDto {
  @IsOptional()
  @IsDateString()
  emergencyDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  informant?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vehicle?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  ubication?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  unitsResponse?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  guardPersonnel?: string;

  @IsOptional()
  @IsNumber()
  emergencyType?: number;

  // Campo opcional para agregar motivo de la edición
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  editReason?: string;
} 