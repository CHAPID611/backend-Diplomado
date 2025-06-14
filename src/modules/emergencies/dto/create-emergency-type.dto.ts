import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateEmergencyTypeDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  emergencyType: string;
} 