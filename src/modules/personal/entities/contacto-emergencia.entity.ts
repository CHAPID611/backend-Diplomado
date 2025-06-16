import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Personal } from './personal.entity';

@Entity('emergencyContact')
export class ContactoEmergencia {
  @PrimaryGeneratedColumn()
  emergencyContactId: number;

  @Column({ length: 100, nullable: false })
  name: string;

  @Column({ length: 50, nullable: false })
  relationship: string;

  @Column({ length: 15, nullable: false })
  mobilePhone: string;

  @OneToOne(() => Personal, personal => personal.emergencyContact)
  personal: Personal;
} 