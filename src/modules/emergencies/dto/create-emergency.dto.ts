import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateNoveltyDto } from './create-novelty.dto';

export class CreateEmergencyDto {
  @IsNotEmpty()
  @IsDateString()
  emergencyDate: string;

  @IsNotEmpty()
  @IsString()
  informant: string;

  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  vehicleIds: number[];

  @IsNotEmpty()
  @IsString()
  ubication: string;

  @IsNotEmpty()
  @IsString()
  turn: string;

  @IsNotEmpty()
  @IsDateString()
  reportTime: string;

  @IsNotEmpty()
  @IsString()
  reportTimeDescription: string;

  @IsNotEmpty()
  @IsDateString()
  departureTime: string;

  @IsNotEmpty()
  @IsString()
  departureTimeDescription: string;

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

  @IsNotEmpty()
  @IsDateString()
  returnEstationTime: string;

  @IsNotEmpty()
  @IsString()
  returnEstationTimeDescription: string;

  @IsNotEmpty()
  @IsString()
  unitsResponse: string;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  personnelIds?: number[];

  @IsString()
  @IsOptional()
  guardPersonnel?: string;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  emergencyType: number;

  @IsNotEmpty()
  @IsNumber()
  emergencyFile: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateNoveltyDto)
  novedades?: CreateNoveltyDto[];
} 