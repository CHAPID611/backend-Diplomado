import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateEmergencyDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  emergencyTypeId: number;

  @IsOptional()
  @IsNumber()
  emergencyFileId?: number;

  @IsDateString()
  emergencyDate: string;

  @IsString()
  informant: string;

  @IsString()
  vehicle: string;

  @IsString()
  ubication: string;

  @IsString()
  turn: string;

  @IsString()
  reportTime: string;

  @IsString()
  departureTime: string;

  @IsString()
  arrivalSceneTime: string;

  @IsString()
  arrivalHospitalTime: string;

  @IsString()
  returnEstationTime: string;

  @IsString()
  unitsResponse: string;

  @IsString()
  guardPersonnel: string;
} 