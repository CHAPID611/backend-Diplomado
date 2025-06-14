import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Emergency } from './emergency.entity';

@Entity('emergencyFiles')
export class EmergencyFile {
  @PrimaryGeneratedColumn()
  emergencyFileId: number;

  @Column({ type: 'varchar', length: 1000 })
  file: string;

  @OneToMany(() => Emergency, emergency => emergency.emergencyFile)
  emergencies: Emergency[];
} 