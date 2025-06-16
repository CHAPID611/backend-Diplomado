import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Emergency } from './emergency.entity';

@Entity('emergenciesTypes')
export class EmergencyType {
  @PrimaryGeneratedColumn()
  emergencyTypeId: number;

  @Column({ length: 100 })
  emergencyType: string;

  @OneToMany(() => Emergency, emergency => emergency.emergencyType)
  emergencies: Emergency[];
} 