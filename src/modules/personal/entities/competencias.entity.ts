import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity('competencias')
export class Competencias {
  @PrimaryGeneratedColumn()
  competenciaId: number;

  @Column({ length: 50, nullable: false })
  name: string;

  @Column({ length: 50, nullable: false })
  category: string;

  @OneToMany('PeopleCompetencias', 'competencia')
  peopleCompetencias: any[];
} 