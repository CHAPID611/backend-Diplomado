import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Emergency } from '../../emergencies/entities/emergency.entity';
import { VehicleStatus } from '../enums/vehicle-status.enum';

@Entity('vehicles')
export class Vehicle {
    @PrimaryGeneratedColumn()
    vehicleId: number;

    @Column({ length: 100 })
    name: string;

    @Column({ length: 20, unique: true })
    plate: string;

    @Column({
        type: 'enum',
        enum: VehicleStatus,
        default: VehicleStatus.AVAILABLE
    })
    status: VehicleStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Emergency, emergency => emergency.vehicles)
    emergencies: Emergency[];
} 