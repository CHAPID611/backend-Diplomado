import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Emergency } from './emergency.entity';
import { Novelty } from './novelty.entity';

@Entity('emergenciesNovelties')
export class EmergenciesNovelty {
  @PrimaryGeneratedColumn()
  emergencyNoveltyId: number;

  @ManyToOne(() => Emergency, emergency => emergency.emergenciesNovelties)
  @JoinColumn({ name: 'emergencyId' })
  emergency: Emergency;

  @ManyToOne(() => Novelty, novelty => novelty.emergenciesNovelties)
  @JoinColumn({ name: 'noveltyId' })
  novelty: Novelty;
} 