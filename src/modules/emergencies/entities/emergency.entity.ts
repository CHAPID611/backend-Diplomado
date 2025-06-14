import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { EmergencyType } from './emergency-type.entity';
import { EmergencyFile } from './emergency-file.entity';
import { EmergenciesNovelty } from './emergencies-novelty.entity';

@Entity('emergencies')
export class Emergency {
  @PrimaryGeneratedColumn()
  emergencyId: number;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => EmergencyType, { eager: true })
  @JoinColumn({ name: 'emergencyType' })
  emergencyType: EmergencyType;

  @ManyToOne(() => EmergencyFile, { eager: true })
  @JoinColumn({ name: 'emergencyFile' })
  emergencyFile: EmergencyFile;

  @Column({ length: 50 })
  emergencyDate: string;

  @Column({ length: 50 })
  informant: string;

  @Column({ length: 50 })
  vehicle: string;

  @Column({ length: 50 })
  ubication: string;

  @Column({ length: 50 })
  turn: string;

  @Column({ length: 50 })
  reportTime: string;

  @Column({ length: 50 })
  departureTime: string;

  @Column({ length: 50 })
  arrivalSceneTime: string;

  @Column({ length: 50 })
  arrivalHospitalTime: string;

  @Column({ length: 50 })
  returnEstationTime: string;

  @Column({ length: 50 })
  unitsResponse: string;

  @Column({ length: 50 })
  guardPersonnel: string;

  @OneToMany(() => EmergenciesNovelty, en => en.emergency)
  emergenciesNovelties: EmergenciesNovelty[];
} 