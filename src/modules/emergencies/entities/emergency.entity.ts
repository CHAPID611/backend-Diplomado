import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, OneToOne } from 'typeorm';
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

  @Column({ type: 'datetime' })
  emergencyDate: Date;

  @Column({ length: 50 })
  informant: string;

  @Column({ length: 50 })
  vehicle: string;

  @Column({ length: 50 })
  ubication: string;

  @Column({ length: 50 })
  turn: string;

  @Column({ type: 'datetime' })
  reportTime: Date;

  @Column({ type: 'text' })
  reportTimeDescription: string;

  @Column({ type: 'datetime' })
  departureTime: Date;

  @Column({ type: 'text' })
  departureTimeDescription: string;

  @Column({ type: 'datetime' })
  arrivalSceneTime: Date;

  @Column({ type: 'text' })
  arrivalSceneTimeDescription: string;

  @Column({ type: 'datetime' })
  arrivalHospitalTime: Date;

  @Column({ type: 'text' })
  arrivalHospitalTimeDescription: string;

  @Column({ type: 'datetime' })
  returnEstationTime: Date;

  @Column({ type: 'text' })
  returnEstationTimeDescription: string;

  @Column({ length: 50 })
  unitsResponse: string;

  @Column({ length: 50 })
  guardPersonnel: string;

  @OneToMany(() => EmergenciesNovelty, en => en.emergency)
  emergenciesNovelties: EmergenciesNovelty[];
} 