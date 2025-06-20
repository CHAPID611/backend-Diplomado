import { IsString, IsNotEmpty, Length, IsEnum, IsOptional } from 'class-validator';
import { VehicleStatus } from '../enums/vehicle-status.enum';

export class CreateVehicleDto {
    @IsString()
    @IsNotEmpty()
    @Length(1, 100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @Length(1, 20)
    plate: string;

    @IsEnum(VehicleStatus)
    @IsOptional()
    status?: VehicleStatus;
} 