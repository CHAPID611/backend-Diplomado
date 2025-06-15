import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, OneToOne } from 'typeorm';
import { User } from '../../../modules/auth/entities/user.entity';
import { EmergencyType } from './emergency-type.entity';
import { EmergencyFile } from './emergency-file.entity';
import { EmergenciesNovelty } from './emergencies-novelty.entity';

@Entity('emergencies')
export class Emergency {
  @PrimaryGeneratedColumn()
  emergencyId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => EmergencyType)
  @JoinColumn({ name: 'emergencyType' })
  emergencyType: EmergencyType;

  @Column()
  emergencyTypeId: number;

  @OneToMany(() => EmergencyFile, emergencyFile => emergencyFile.emergency)
  emergencyFiles: EmergencyFile[];

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

  @Column({ type: 'datetime', nullable: true })
  arrivalSceneTime: Date;

  @Column({ type: 'text', nullable: true })
  arrivalSceneTimeDescription: string;

  @Column({ type: 'datetime', nullable: true })
  arrivalHospitalTime: Date;

  @Column({ type: 'text', nullable: true })
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