import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Competencias } from '../entities/competencias.entity';

@Injectable()
export class CompetenciasService {
  constructor(
    @InjectRepository(Competencias)
    private readonly competenciasRepository: Repository<Competencias>,
  ) {}

  findAll() {
    return this.competenciasRepository.find();
  }

  async findGroupedByCategory() {
    const competencias = await this.competenciasRepository.find();
    const grouped = {};
    for (const competencia of competencias) {
      if (!grouped[competencia.category]) {
        grouped[competencia.category] = [];
      }
      grouped[competencia.category].push(competencia);
    }
    return grouped;
  }

  create(createCompetenciaDto: any) {
    const competencia = this.competenciasRepository.create(createCompetenciaDto);
    return this.competenciasRepository.save(competencia);
  }
} 