import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergenciesController } from './emergencies.controller';
import { EmergencyTypesController } from './emergency-types.controller';
import { EmergenciesService } from './emergencies.service';
import { Emergency } from './entities/emergency.entity';
import { User } from '../auth/entities/user.entity';
import { EmergencyType } from './entities/emergency-type.entity';
import { EmergencyFile } from './entities/emergency-file.entity';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Emergency, User, EmergencyType, EmergencyFile]),
  ],
  controllers: [EmergenciesController, EmergencyTypesController],
  providers: [EmergenciesService, CloudinaryService],
})
export class EmergenciesModule {} 