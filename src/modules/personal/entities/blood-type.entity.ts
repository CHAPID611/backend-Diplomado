import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Personal } from './personal.entity';

@Entity('bloodType')
export class BloodType {
  @PrimaryGeneratedColumn()
  bloodTypeId: number;

  @Column({ length: 10, nullable: false })
  bloodType: string;

  @OneToMany('Personal', 'bloodTypeEntity')
  personal: any[];
} 