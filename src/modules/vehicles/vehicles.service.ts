import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
    constructor(
        @InjectRepository(Vehicle)
        private vehiclesRepository: Repository<Vehicle>
    ) {}

    async create(createVehicleDto: CreateVehicleDto): Promise<Vehicle> {
        const existingVehicle = await this.vehiclesRepository.findOne({
            where: { plate: createVehicleDto.plate }
        });

        if (existingVehicle) {
            throw new ConflictException('Ya existe un vehículo con esta placa');
        }

        const vehicle = this.vehiclesRepository.create(createVehicleDto);
        return await this.vehiclesRepository.save(vehicle);
    }

    async findAll(): Promise<Vehicle[]> {
        return await this.vehiclesRepository.find();
    }

    async findOne(id: number): Promise<Vehicle> {
        const vehicle = await this.vehiclesRepository.findOne({
            where: { vehicleId: id }
        });

        if (!vehicle) {
            throw new NotFoundException('Vehículo no encontrado');
        }

        return vehicle;
    }

    async update(id: number, updateVehicleDto: UpdateVehicleDto): Promise<Vehicle> {
        const vehicle = await this.findOne(id);

        if (updateVehicleDto.plate) {
            const existingVehicle = await this.vehiclesRepository.findOne({
                where: { plate: updateVehicleDto.plate }
            });

            if (existingVehicle && existingVehicle.vehicleId !== id) {
                throw new ConflictException('Ya existe un vehículo con esta placa');
            }
        }

        Object.assign(vehicle, updateVehicleDto);
        return await this.vehiclesRepository.save(vehicle);
    }

    async remove(id: number): Promise<void> {
        const vehicle = await this.findOne(id);
        await this.vehiclesRepository.remove(vehicle);
    }
} 