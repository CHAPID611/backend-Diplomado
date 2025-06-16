import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';
import { Personal } from './entities/personal.entity';
import { User } from '../auth/entities/user.entity';
import { ContactoEmergencia } from './entities/contacto-emergencia.entity';
import { PeopleCompetencias } from './entities/people-competencias.entity';
import { Competencias } from './entities/competencias.entity';
import { BloodType } from './entities/blood-type.entity';
import { States } from './entities/states.entity';
import { Ranges } from './entities/ranges.entity';
import { EmploymentData } from './entities/employment-data.entity';
import { CompetenciasService } from './services/competencias.service';
import { ConstantsService } from './services/constants.service';
import { ConstantesController } from './controllers/constantes.controller';
import { CompetenciasController } from './controllers/competencias.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Personal, 
      User, 
      ContactoEmergencia, 
      PeopleCompetencias, 
      Competencias,
      BloodType,
      States,
      Ranges,
      EmploymentData
    ]),
  ],
  controllers: [
    PersonalController, 
    ConstantesController,
    CompetenciasController
  ],
  providers: [
    PersonalService, 
    CompetenciasService,
    ConstantsService
  ],
})
export class PersonalModule {} 