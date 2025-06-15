import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergenciesController } from './emergencies.controller';
import { EmergencyTypesController } from './emergency-types.controller';
import { NoveltiesController } from './novelties.controller';
import { EmergenciesService } from './emergencies.service';
import { NoveltiesService } from './novelties.service';
import { Emergency } from './entities/emergency.entity';
import { User } from '../auth/entities/user.entity';
import { EmergencyType } from './entities/emergency-type.entity';
import { EmergencyFile } from './entities/emergency-file.entity';
import { Novelty } from './entities/novelty.entity';
import { EmergenciesNovelty } from './entities/emergencies-novelty.entity';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Emergency,
      User,
      EmergencyType,
      EmergencyFile,
      Novelty,
      EmergenciesNovelty
    ]),
  ],
  controllers: [EmergenciesController, EmergencyTypesController, NoveltiesController],
  providers: [EmergenciesService, NoveltiesService, CloudinaryService],
})
export class EmergenciesModule {} 