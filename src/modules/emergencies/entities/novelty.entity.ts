import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { EmergenciesNovelty } from './emergencies-novelty.entity';

@Entity('novelties')
export class Novelty {
  @PrimaryGeneratedColumn()
  noveltyId: number;

  @Column({ length: 100 })
  novelty: string;

  @Column({ length: 50 })
  noveltyDate: string;

  @Column({ length: 100 })
  description: string;

  @OneToMany(() => EmergenciesNovelty, en => en.novelty)
  emergenciesNovelties: EmergenciesNovelty[];
} 