import { IsString, IsOptional, IsNumber, IsDateString, IsArray, IsObject, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class ContactoEmergenciaDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;
}

class EmploymentDataDto {
  @IsOptional()
  @IsNumber()
  rangeId?: number;

  @IsOptional()
  @IsNumber()
  stateId?: number;

  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdatePersonalDto {
  @IsOptional()
  @IsNumber()
  bloodTypeId?: number;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  secondName?: string;

  @IsOptional()
  @IsString()
  firstLastName?: string;

  @IsOptional()
  @IsString()
  secondLastName?: string;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  competencias?: number[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactoEmergenciaDto)
  emergencyContact?: ContactoEmergenciaDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EmploymentDataDto)
  employmentData?: EmploymentDataDto;
} 