import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StatisticsService, EmergencyStatistics } from './statistics.service';
import { StatisticsFiltersDto } from './dto/statistics-filters.dto';

@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}



  @Get()
  @Roles('admin', 'operator')
  async getStatistics(@Query() filters: StatisticsFiltersDto): Promise<EmergencyStatistics> {
    return this.statisticsService.generateStatistics(filters);
  }

  @Get('summary')
  @Roles('admin', 'operator')
  async getStatisticsSummary(@Query() filters: StatisticsFiltersDto): Promise<{
    totalEmergencies: number;
    averageResponseTime: string;
    mostCommonType: string;
    emergenciesWithinTarget: number;
    emergenciesWithinTargetPercentage: number;
  }> {
    const stats = await this.statisticsService.generateStatistics(filters);
    
    return {
      totalEmergencies: stats.totalEmergencies,
      averageResponseTime: stats.averageResponseTime,
      mostCommonType: stats.mostCommonEmergencyType.type,
      emergenciesWithinTarget: stats.timeAnalysis.emergenciesWithinTarget,
      emergenciesWithinTargetPercentage: stats.timeAnalysis.emergenciesWithinTargetPercentage
    };
  }

  @Get('by-type')
  @Roles('admin', 'operator')
  async getStatisticsByType(@Query() filters: StatisticsFiltersDto) {
    const stats = await this.statisticsService.generateStatistics(filters);
    return {
      emergenciesByType: stats.emergenciesByType,
      mostCommonType: stats.mostCommonEmergencyType
    };
  }

  @Get('monthly-trends')
  @Roles('admin', 'operator')
  async getMonthlyTrends(@Query() filters: StatisticsFiltersDto) {
    const stats = await this.statisticsService.generateStatistics(filters);
    return {
      monthlyTrends: stats.monthlyTrends
    };
  }

  @Get('time-analysis')
  @Roles('admin', 'operator')
  async getTimeAnalysis(@Query() filters: StatisticsFiltersDto) {
    const stats = await this.statisticsService.generateStatistics(filters);
    return {
      timeAnalysis: stats.timeAnalysis
    };
  }
} 