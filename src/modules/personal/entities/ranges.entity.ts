import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('ranges')
export class Ranges {
  @PrimaryGeneratedColumn()
  rangeId: number;

  @Column({ length: 50, nullable: false })
  range: string;

  @OneToMany('EmploymentData', 'rangeEntity')
  employmentData: any[];
} 