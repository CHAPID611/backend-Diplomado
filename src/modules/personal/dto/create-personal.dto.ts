import { IsString, IsNotEmpty, IsNumber, IsDateString, IsArray, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class ContactoEmergenciaDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  relationship: string;

  @IsNotEmpty()
  @IsString()
  mobilePhone: string;
}

class EmploymentDataDto {
  @IsNotEmpty()
  @IsNumber()
  rangeId: number;

  @IsNotEmpty()
  @IsNumber()
  stateId: number;

  @IsNotEmpty()
  @IsDateString()
  admissionDate: string;

  @IsNotEmpty()
  @IsNumber()
  yearsOfExperience: number;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreatePersonalDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsNumber()
  bloodTypeId: number;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  secondName?: string;

  @IsNotEmpty()
  @IsString()
  firstLastName: string;

  @IsOptional()
  @IsString()
  secondLastName?: string;

  @IsNotEmpty()
  @IsString()
  idNumber: string;

  @IsNotEmpty()
  @IsDateString()
  birthDate: string;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @IsNotEmpty()
  @IsArray()
  @IsNumber({}, { each: true })
  competencias: number[];

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => ContactoEmergenciaDto)
  emergencyContact: ContactoEmergenciaDto;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => EmploymentDataDto)
  employmentData: EmploymentDataDto;
} 