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

  @Get()
  @Roles(ROLES.ADMIN)
  async generateReport(
    @Query() filters: ReportFiltersDto,
    @Response() res: ExpressResponse,
  ) {
    try {
      // Validar formato
      if (!filters.format || filters.format !== ReportFormat.PDF) {
        throw new BadRequestException('Formato de reporte requerido: pdf');
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm', { locale: es });
      const baseFilename = `reporte_emergencias_${timestamp}`;

      const pdfBuffer = await this.reportsService.generatePDFReport(filters);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFilename}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer); 

    } catch (error) {
      console.error('Error generando reporte:', error);
      throw new BadRequestException('Error al generar el reporte: ' + error.message);
    }
  }

  @Get('preview')
  @Roles(ROLES.ADMIN)
  async getReportPreview(@Query() filters: ReportFiltersDto) {
    try {
      // Generar solo los datos consolidados para preview
      const data = await this.reportsService.consolidateData(filters);
      
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

  @Get('debug')
  @Roles(ROLES.ADMIN)
  async debugReports(@Query() filters: ReportFiltersDto) {
    try {
      const data = await this.reportsService.debugReportData(filters);
      return {
        success: true,
        debug: data
      };
    } catch (error) {
      console.error('Error en debug:', error);
      throw new BadRequestException('Error en debug: ' + error.message);
    }
  }
} 