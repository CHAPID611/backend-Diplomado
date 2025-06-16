import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('states')
export class States {
  @PrimaryGeneratedColumn()
  stateId: number;

  @Column({ length: 50, nullable: false })
  state: string;

  @OneToMany('EmploymentData', 'stateEntity')
  employmentData: any[];
} 