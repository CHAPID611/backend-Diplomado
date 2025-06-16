import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Ranges } from './ranges.entity';
import { States } from './states.entity';
import { Personal } from './personal.entity';

@Entity('employmentData')
export class EmploymentData {
  @PrimaryGeneratedColumn()
  employmentDataId: number;

  @ManyToOne(() => Ranges)
  @JoinColumn({ name: 'rangeId' })
  rangeEntity: Ranges;

  @Column({ nullable: false })
  rangeId: number;

  @ManyToOne(() => States)
  @JoinColumn({ name: 'stateId' })
  stateEntity: States;

  @Column({ nullable: false })
  stateId: number;

  @Column({ type: 'date', nullable: false })
  admissionDate: Date;

  @Column({ nullable: false })
  yearsOfExperience: number;

  @Column({ length: 500, nullable: true })
  observations: string;

  @OneToMany('Personal', 'employmentDataEntity')
  personal: any[];
} 