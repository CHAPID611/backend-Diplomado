import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Emergency } from './emergency.entity';

@Entity('emergencyFiles')
export class EmergencyFile {
  @PrimaryGeneratedColumn()
  emergencyFileId: number;

  @Column({ length: 1000 })
  file: string;

  @ManyToOne(() => Emergency)
  @JoinColumn({ name: 'emergencyId' })
  emergency: Emergency;

  @Column()
  emergencyId: number;
} 