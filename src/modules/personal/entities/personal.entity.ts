import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany, ManyToOne } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { BloodType } from './blood-type.entity';
import { EmploymentData } from './employment-data.entity';
import { ContactoEmergencia } from './contacto-emergencia.entity';
import { PeopleCompetencias } from './people-competencias.entity';

@Entity('personal_new')
export class Personal {
  @PrimaryGeneratedColumn()
  personalId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: false })
  userId: number;

  @ManyToOne(() => BloodType)
  @JoinColumn({ name: 'bloodTypeId' })
  bloodTypeEntity: BloodType;

  @Column({ nullable: false })
  bloodTypeId: number;

  @ManyToOne(() => EmploymentData)
  @JoinColumn({ name: 'employmentDataId' })
  employmentDataEntity: EmploymentData;

  @Column({ nullable: false })
  employmentDataId: number;

  @OneToOne(() => ContactoEmergencia)
  @JoinColumn({ name: 'emergencyContactId' })
  emergencyContact: ContactoEmergencia;

  @Column({ nullable: false })
  emergencyContactId: number;

  @Column({ length: 50, nullable: false })
  firstName: string;

  @Column({ length: 50, nullable: true })
  secondName: string;

  @Column({ length: 50, nullable: false })
  firstLastName: string;

  @Column({ length: 50, nullable: true })
  secondLastName: string;

  @Column({ length: 20, nullable: false })
  idNumber: string;

  @Column({ type: 'date', nullable: false })
  birthDate: Date;

  @Column({ length: 200, nullable: false })
  address: string;

  @Column({ length: 15, nullable: false })
  phoneNumber: string;

  @OneToMany(() => PeopleCompetencias, peopleCompetencias => peopleCompetencias.personal)
  peopleCompetencias: PeopleCompetencias[];
} 