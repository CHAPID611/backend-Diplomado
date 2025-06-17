import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { EmergencyType } from '../emergencies/entities/emergency-type.entity';
import { ReportFiltersDto, ReportPeriod } from './dto/report-filters.dto';
import { subDays, subMonths, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export interface EmergencyStatistics {
  totalEmergencies: number;
  averageResponseTime: string;
  averageResponseTimeMinutes: number;
  mostCommonEmergencyType: {
    type: string;
    count: number;
    percentage: number;
  };
  emergenciesByType: Array<{
    type: string;
    count: number;
    percentage: number;
    averageResponseTime: string;
    averageResponseTimeMinutes: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    year: number;
    totalEmergencies: number;
    averageResponseTime: string;
    averageResponseTimeMinutes: number;
  }>;
  timeAnalysis: {
    targetTime: number; // en minutos
    maxTime: number;
    averageTime: number;
    minTime: number;
    emergenciesWithinTarget: number;
    emergenciesWithinTargetPercentage: number;
    emergenciesOverTarget: number;
    emergenciesOverTargetPercentage: number;
  };
}

@Injectable()
export class StatisticsService {
  private readonly DEFAULT_TARGET_TIME = 15; // 15 minutos como tiempo objetivo por defecto

  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepository: Repository<Emergency>,
    @InjectRepository(EmergencyType)
    private readonly emergencyTypeRepository: Repository<EmergencyType>,
  ) {}

  private getDateRange(period: ReportPeriod, startDate?: string, endDate?: string) {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    // Normalizar el período a string para comparación
    const periodStr = String(period).toLowerCase();

    switch (periodStr) {
      case 'last_7_days':
        start = subDays(today, 7);
        break;
      case 'last_month':
        start = subMonths(today, 1);
        break;
      case 'last_3_months':
        start = subMonths(today, 3);
        break;
      case 'last_6_months':
        start = subMonths(today, 6);
        break;
      case 'last_year':
        start = subMonths(today, 12);
        break;
      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Las fechas de inicio y fin son requeridas para el periodo personalizado');
        }
        start = new Date(startDate);
        end = new Date(endDate);
        break;
      default:
        start = subMonths(today, 1);
    }

    // Asegurar que las fechas incluyan todo el día
    // Establecer start al inicio del día (00:00:00)
    start.setHours(0, 0, 0, 0);
    
    // Establecer end al final del día (23:59:59.999)
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private calculateResponseTimeMinutes(emergency: Emergency): number | null {
    if (!emergency.reportTime || !emergency.arrivalSceneTime) {
      return null;
    }
    
    const reportTime = new Date(emergency.reportTime);
    const arrivalTime = new Date(emergency.arrivalSceneTime);
    const diffMs = arrivalTime.getTime() - reportTime.getTime();
    return Math.round(diffMs / (1000 * 60)); // Convertir a minutos
  }

  private formatResponseTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minutos`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  async generateStatistics(filters: ReportFiltersDto, targetTime?: number): Promise<EmergencyStatistics> {
    const { period = ReportPeriod.LAST_MONTH, startDate, endDate, emergencyTypeId, userId } = filters;
    const { start, end } = this.getDateRange(period, startDate, endDate);
    const objectiveTime = targetTime || this.DEFAULT_TARGET_TIME;

    // Consulta principal
    const queryBuilder = this.emergencyRepository
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.user', 'user')
      .leftJoinAndSelect('emergency.emergencyType', 'emergencyType')
      .where('emergency.emergencyDate BETWEEN :start AND :end', { start, end });

    if (emergencyTypeId) {
      queryBuilder.andWhere('emergency.emergencyType = :emergencyTypeId', { emergencyTypeId });
    }

    if (userId) {
      queryBuilder.andWhere('emergency.user = :userId', { userId });
    }

    const emergencies = await queryBuilder
      .orderBy('emergency.emergencyDate', 'DESC')
      .getMany();

    // 1. Total de emergencias
    const totalEmergencies = emergencies.length;

    // 2. Tiempo promedio de respuesta
    const responseTimes = emergencies
      .map(e => this.calculateResponseTimeMinutes(e))
      .filter(time => time !== null);

    const averageResponseTimeMinutes = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
      : 0;

    const averageResponseTime = responseTimes.length > 0 
      ? this.formatResponseTime(averageResponseTimeMinutes)
      : 'N/A';

    // 3. Tipo de emergencia más común
    const typeCount = emergencies.reduce((acc, emergency) => {
      const typeName = emergency.emergencyType.emergencyType;
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0];

    const mostCommonEmergencyType = mostCommonType ? {
      type: mostCommonType[0],
      count: mostCommonType[1],
      percentage: parseFloat(((mostCommonType[1] / totalEmergencies) * 100).toFixed(2))
    } : { type: 'N/A', count: 0, percentage: 0 };

    // 4. Emergencias por tipo con estadísticas detalladas
    const emergenciesByType = Object.entries(typeCount).map(([type, count]) => {
      const typeEmergencies = emergencies.filter(e => e.emergencyType.emergencyType === type);
      const typeResponseTimes = typeEmergencies
        .map(e => this.calculateResponseTimeMinutes(e))
        .filter(time => time !== null);

      const avgTime = typeResponseTimes.length > 0
        ? Math.round(typeResponseTimes.reduce((sum, time) => sum + time, 0) / typeResponseTimes.length)
        : 0;

      return {
        type,
        count,
        percentage: parseFloat(((count / totalEmergencies) * 100).toFixed(2)),
        averageResponseTime: typeResponseTimes.length > 0 ? this.formatResponseTime(avgTime) : 'N/A',
        averageResponseTimeMinutes: avgTime
      };
    }).sort((a, b) => b.count - a.count);

    // 5. Tendencias mensuales
    const monthlyTrends = this.calculateMonthlyTrends(emergencies, start, end);

    // 6. Análisis de tiempos
    const timeAnalysis = this.calculateTimeAnalysis(emergencies, objectiveTime);

    return {
      totalEmergencies,
      averageResponseTime,
      averageResponseTimeMinutes,
      mostCommonEmergencyType,
      emergenciesByType,
      monthlyTrends,
      timeAnalysis
    };
  }

  private calculateMonthlyTrends(emergencies: Emergency[], start: Date, end: Date) {
    const months = eachMonthOfInterval({ start, end });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthEmergencies = emergencies.filter(e => {
        const emergencyDate = new Date(e.emergencyDate);
        return emergencyDate >= monthStart && emergencyDate <= monthEnd;
      });

      const monthResponseTimes = monthEmergencies
        .map(e => this.calculateResponseTimeMinutes(e))
        .filter(time => time !== null);

      const avgTime = monthResponseTimes.length > 0
        ? Math.round(monthResponseTimes.reduce((sum, time) => sum + time, 0) / monthResponseTimes.length)
        : 0;

      return {
        month: format(month, 'MMMM', { locale: es }),
        year: month.getFullYear(),
        totalEmergencies: monthEmergencies.length,
        averageResponseTime: monthResponseTimes.length > 0 ? this.formatResponseTime(avgTime) : 'N/A',
        averageResponseTimeMinutes: avgTime
      };
    });
  }

  private calculateTimeAnalysis(emergencies: Emergency[], targetTime: number) {
    const responseTimes = emergencies
      .map(e => this.calculateResponseTimeMinutes(e))
      .filter(time => time !== null);

    if (responseTimes.length === 0) {
      return {
        targetTime,
        maxTime: 0,
        averageTime: 0,
        minTime: 0,
        emergenciesWithinTarget: 0,
        emergenciesWithinTargetPercentage: 0,
        emergenciesOverTarget: 0,
        emergenciesOverTargetPercentage: 0
      };
    }

    const maxTime = Math.max(...responseTimes);
    const minTime = Math.min(...responseTimes);
    const averageTime = Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);

    const emergenciesWithinTarget = responseTimes.filter(time => time <= targetTime).length;
    const emergenciesOverTarget = responseTimes.length - emergenciesWithinTarget;

    return {
      targetTime,
      maxTime,
      averageTime,
      minTime,
      emergenciesWithinTarget,
      emergenciesWithinTargetPercentage: parseFloat(((emergenciesWithinTarget / responseTimes.length) * 100).toFixed(2)),
      emergenciesOverTarget,
      emergenciesOverTargetPercentage: parseFloat(((emergenciesOverTarget / responseTimes.length) * 100).toFixed(2))
    };
  }


} 