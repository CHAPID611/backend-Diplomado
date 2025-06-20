import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { EmergencyType } from '../emergencies/entities/emergency-type.entity';
import { User } from '../auth/entities/user.entity';
import { SystemConfiguration } from './entities/system-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Emergency,
      EmergencyType,
      User,
      SystemConfiguration
    ]),
  ],
  controllers: [ReportsController, StatisticsController, SystemConfigController],
  providers: [ReportsService, StatisticsService, SystemConfigService],
  exports: [SystemConfigService],
})
export class ReportsModule {} 