import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Personal } from './personal.entity';
import { Competencias } from './competencias.entity';

@Entity('peopleCompetencias')
export class PeopleCompetencias {
  @PrimaryColumn()
  personalId: number;

  @PrimaryColumn()
  competenciaId: number;

  @ManyToOne(() => Personal, personal => personal.peopleCompetencias)
  @JoinColumn({ name: 'personalId' })
  personal: Personal;

  @ManyToOne(() => Competencias, competencia => competencia.peopleCompetencias)
  @JoinColumn({ name: 'competenciaId' })
  competencia: Competencias;
} 