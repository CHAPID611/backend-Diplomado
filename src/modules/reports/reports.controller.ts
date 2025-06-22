import { Controller, Get, Query, UseGuards, Response, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportFiltersDto, ReportFormat } from './dto/report-filters.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';
import { Response as ExpressResponse } from 'express';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('emergencias')
  @Roles(ROLES.ADMIN)
  async generateEmergencyReport(
    @Query() filters: ReportFiltersDto,
    @Response() res: ExpressResponse,
  ) {
    try {
      console.log('=== INICIO GENERACIÓN REPORTE EMERGENCIAS ===');
      console.log('Filtros recibidos:', JSON.stringify(filters, null, 2));
      console.log('Tipo de filters.format:', typeof filters.format);
      console.log('Valor de filters.format:', filters.format);
      console.log('ReportFormat.PDF:', ReportFormat.PDF);
      console.log('Comparación format === PDF:', filters.format === ReportFormat.PDF);
      
      // Validar y normalizar formato
      const formatValue = (filters.format as string)?.toLowerCase();
      if (formatValue && formatValue !== 'pdf') {
        console.error('❌ Formato inválido. Expected: pdf, Received:', formatValue);
        throw new BadRequestException('Formato de reporte requerido: pdf');
      }
      
      // Asegurar que el formato esté correctamente asignado (usar PDF por defecto)
      filters.format = ReportFormat.PDF;

      // Convertir emergencyId a número si existe
      if (filters.emergencyId) {
        filters.emergencyId = Number(filters.emergencyId);
        console.log('EmergencyId convertido a número:', filters.emergencyId);
      }

      console.log('Formato validado, iniciando generación...');
      console.log('Filtros finales procesados:', JSON.stringify(filters, null, 2));
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es });
      const baseFilename = `reporte_emergencias_${timestamp}`;

      const pdfBuffer = await this.reportsService.generateEmergencyReport(filters);
      console.log('PDF generado exitosamente, tamaño:', pdfBuffer.length);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer); 

    } catch (error) {
      console.error('Error generando reporte de emergencias:', error);
      console.error('Stack trace:', error.stack);
      throw new BadRequestException('Error al generar el reporte de emergencias: ' + error.message);
    }
  }

  @Get('estadisticas')
  @Roles(ROLES.ADMIN)
  async generateStatisticsReport(
    @Query() filters: ReportFiltersDto,
    @Response() res: ExpressResponse,
  ) {
    try {
      // Validar formato
      if (!filters.format || filters.format !== ReportFormat.PDF) {
        throw new BadRequestException('Formato de reporte requerido: pdf');
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es });
      const baseFilename = `estadisticas_emergencias_${timestamp}`;

      const pdfBuffer = await this.reportsService.generateStatisticsReport(filters);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer); 

    } catch (error) {
      console.error('Error generando reporte de estadísticas:', error);
      throw new BadRequestException('Error al generar el reporte de estadísticas: ' + error.message);
    }
  }

  @Get('debug')
  async debugFilters(@Query() filters: any) {
    console.log('=== DEBUG ENDPOINT (SIN AUTH) ===');
    console.log('Query params recibidos:', filters);
    console.log('Tipos:', Object.keys(filters).map(key => `${key}: ${typeof filters[key]}`));
    
    return {
      success: true,
      received: filters,
      types: Object.keys(filters).reduce((acc, key) => {
        acc[key] = typeof filters[key];
        return acc;
      }, {} as any),
      timestamp: new Date().toISOString()
    };
  }

  @Get('debug-auth')
  @Roles(ROLES.ADMIN)
  async debugFiltersWithAuth(@Query() filters: any) {
    console.log('=== DEBUG ENDPOINT (CON AUTH) ===');
    console.log('Query params recibidos:', filters);
    console.log('Tipos:', Object.keys(filters).map(key => `${key}: ${typeof filters[key]}`));
    
    return {
      success: true,
      received: filters,
      types: Object.keys(filters).reduce((acc, key) => {
        acc[key] = typeof filters[key];
        return acc;
      }, {} as any),
      timestamp: new Date().toISOString(),
      authenticated: true
    };
  }

  @Get('preview')
  @Roles(ROLES.ADMIN)
  async getReportPreview(@Query() filters: Omit<ReportFiltersDto, 'format'>) {
    try {
      // Crear filtros completos sin requerir format para preview
      const completeFilters: ReportFiltersDto = {
        ...filters,
        format: ReportFormat.PDF // Default para consolidateData
      };
      
      // Generar solo los datos consolidados para preview
      const data = await this.reportsService.consolidateData(completeFilters);
      
      return {
        success: true,
        preview: {
          period: {
            start: format(data.period.start, 'dd/MM/yyyy', { locale: es }),
            end: format(data.period.end, 'dd/MM/yyyy', { locale: es })
          },
          totalEmergencies: data.totalEmergencies,
          averageResponseTime: data.averageResponseTime,
          emergenciesByType: data.emergenciesByType,
          emergenciesByUser: data.emergenciesByUser,
          sampleEmergencies: data.emergencies.slice(0, 5) // Solo 5 ejemplos
        }
      };
    } catch (error) {
      console.error('Error generando preview:', error);
      throw new BadRequestException('Error al generar preview: ' + error.message);
    }
  }


} 