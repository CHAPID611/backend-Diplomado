import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { EmergencyType } from '../emergencies/entities/emergency-type.entity';
import { User } from '../auth/entities/user.entity';
import { ReportFiltersDto, ReportPeriod } from './dto/report-filters.dto';
import { StatisticsService, EmergencyStatistics } from './statistics.service';
import { subDays, subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Emergency)
    private readonly emergencyRepository: Repository<Emergency>,
    @InjectRepository(EmergencyType)
    private readonly emergencyTypeRepository: Repository<EmergencyType>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly statisticsService: StatisticsService,
  ) {}

  private getDateRange(period: ReportPeriod, startDate?: string, endDate?: string) {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (period) {
      case ReportPeriod.LAST_7_DAYS:
        start = subDays(today, 7);
        break;
      case ReportPeriod.LAST_MONTH:
        start = subMonths(today, 1);
        break;
      case ReportPeriod.LAST_3_MONTHS:
        start = subMonths(today, 3);
        break;
      case ReportPeriod.LAST_6_MONTHS:
        start = subMonths(today, 6);
        break;
      case ReportPeriod.LAST_YEAR:
        start = subMonths(today, 12);
        break;
      case ReportPeriod.CUSTOM:
        if (!startDate || !endDate) {
          throw new BadRequestException('Las fechas de inicio y fin son requeridas para el periodo personalizado');
        }
        start = new Date(startDate);
        end = new Date(endDate);
        if (end > today) {
          throw new BadRequestException('La fecha final no puede ser mayor a la fecha actual');
        }
        break;
      default:
        throw new BadRequestException('Periodo no válido');
    }

    // Asegurar que las fechas incluyan todo el día
    // Establecer start al inicio del día (00:00:00)
    start.setHours(0, 0, 0, 0);
    
    // Establecer end al final del día (23:59:59.999)
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  async consolidateData(filters: ReportFiltersDto) {
    const { period = ReportPeriod.LAST_MONTH, startDate, endDate, emergencyTypeId, userId } = filters;
    const { start, end } = this.getDateRange(period, startDate, endDate);

    const queryBuilder = this.emergencyRepository
      .createQueryBuilder('emergency')
      .leftJoinAndSelect('emergency.user', 'user')
      .leftJoinAndSelect('emergency.emergencyType', 'emergencyType')
      .leftJoinAndSelect('emergency.emergencyFiles', 'emergencyFiles')
      .leftJoinAndSelect('emergency.emergenciesNovelties', 'emergenciesNovelties')
      .leftJoinAndSelect('emergenciesNovelties.novelty', 'novelty')
      .where('emergency.emergencyDate BETWEEN :start AND :end', { start, end });

    if (emergencyTypeId) {
      queryBuilder.andWhere('emergency.emergencyType = :emergencyTypeId', {
        emergencyTypeId,
      });
    }

    if (userId) {
      queryBuilder.andWhere('emergency.user = :userId', {
        userId,
      });
    }

    const emergencies = await queryBuilder
      .orderBy('emergency.emergencyDate', 'DESC')
      .getMany();



    // Obtener estadísticas avanzadas usando el StatisticsService
    const advancedStats = await this.statisticsService.generateStatistics(filters);

    // Estadísticas consolidadas (mantener compatibilidad)
    const totalEmergencies = emergencies.length;
    const emergenciesByType = await this.getEmergenciesByType(emergencies);
    const emergenciesByUser = await this.getEmergenciesByUser(emergencies);
    const averageResponseTime = this.calculateAverageResponseTime(emergencies);

    return {
      period: { start, end },
      totalEmergencies,
      emergencies,
      emergenciesByType,
      emergenciesByUser,
      averageResponseTime,
      advancedStats, // Nuevas estadísticas avanzadas
      generatedAt: new Date()
    };
  }

  private getEmergenciesByType(emergencies: Emergency[]) {
    const typeCount = emergencies.reduce((acc, emergency) => {
      const typeName = emergency.emergencyType.emergencyType;
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
      percentage: ((count / emergencies.length) * 100).toFixed(2)
    }));
  }

  private getEmergenciesByUser(emergencies: Emergency[]) {
    const userCount = emergencies.reduce((acc, emergency) => {
      const userEmail = emergency.user.email;
      acc[userEmail] = (acc[userEmail] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(userCount).map(([user, count]) => ({
      user,
      count,
      percentage: ((count / emergencies.length) * 100).toFixed(2)
    }));
  }

  private calculateAverageResponseTime(emergencies: Emergency[]): string {
    const responseTimes = emergencies
      .filter(e => e.reportTime && e.arrivalSceneTime)
      .map(e => {
        const reportTime = new Date(e.reportTime);
        const arrivalTime = new Date(e.arrivalSceneTime);
        return arrivalTime.getTime() - reportTime.getTime();
      });

    if (responseTimes.length === 0) return 'N/A';

    const averageMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const averageMinutes = Math.round(averageMs / (1000 * 60));
    return `${averageMinutes} minutos`;
  }

  private generateEmergencyNarrative(emergency: Emergency): string {
    const events: Array<{
      time: Date;
      title: string;
      description: string;
    }> = [];
    
    // 1. Reporte inicial
    if (emergency.reportTime) {
      const time = format(new Date(emergency.reportTime), 'HH:mm', { locale: es });
      events.push({
        time: new Date(emergency.reportTime),
        title: 'REPORTE INICIAL',
        description: `${time} - Se recibe llamada de emergencia. ${emergency.informant} reporta ${emergency.emergencyType.emergencyType.toLowerCase()} en ${emergency.ubication}. ${emergency.reportTimeDescription || ''}`
      });
    }

    // 2. Salida de unidades
    if (emergency.departureTime) {
      const time = format(new Date(emergency.departureTime), 'HH:mm', { locale: es });
      events.push({
        time: new Date(emergency.departureTime),
        title: 'SALIDA DE UNIDADES',
        description: `${time} - Personal de guardia se dirige al lugar del incidente. ${emergency.vehicles} despachado con ${emergency.guardPersonnel}. ${emergency.departureTimeDescription || ''}`
      });
    }

    // 3. Llegada a escena
    if (emergency.arrivalSceneTime) {
      const time = format(new Date(emergency.arrivalSceneTime), 'HH:mm', { locale: es });
      events.push({
        time: new Date(emergency.arrivalSceneTime),
        title: 'LLEGADA A ESCENA',
        description: `${time} - Unidades arriban al lugar del incidente. ${emergency.arrivalSceneTimeDescription || 'Se procede con las labores correspondientes según protocolo.'}`
      });
    }

    // 4. Traslado a hospital (si aplica)
    if (emergency.arrivalHospitalTime) {
      const time = format(new Date(emergency.arrivalHospitalTime), 'HH:mm', { locale: es });
      events.push({
        time: new Date(emergency.arrivalHospitalTime),
        title: 'TRASLADO A HOSPITAL',
        description: `${time} - ${emergency.arrivalHospitalTimeDescription || 'Traslado de paciente a centro asistencial para atención médica especializada.'}`
      });
    }

    // 5. Regreso a estación
    if (emergency.returnEstationTime) {
      const time = format(new Date(emergency.returnEstationTime), 'HH:mm', { locale: es });
      events.push({
        time: new Date(emergency.returnEstationTime),
        title: 'REGRESO A ESTACIÓN',
        description: `${time} - ${emergency.returnEstationTimeDescription || 'Misión completada. Unidades regresan a estación operativa.'}`
      });
    }

    // Ordenar eventos por tiempo
    events.sort((a, b) => a.time.getTime() - b.time.getTime());

    // Generar narrativa
    return events.map(event => `${event.title}\n${event.description}`).join('\n\n');
  }

  private generateNoveltiesText(emergency: Emergency): string {
    if (!emergency.emergenciesNovelties || emergency.emergenciesNovelties.length === 0) {
      return 'No se registraron novedades adicionales.';
    }

    return emergency.emergenciesNovelties
      .map((en, index) => {
        const novelty = en.novelty;
        return `• Novedad ${index + 1}: "${novelty.novelty}" - ${novelty.noveltyDate}\n  ${novelty.description}`;
      })
      .join('\n\n');
  }

  private async downloadImage(url: string): Promise<Buffer | null> {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Error descargando imagen ${url}:`, error);
      return null;
    }
  }

  private addHeader(doc: any): void {
    // Encabezado institucional con colores institucionales
    const currentY = doc.y;
    
    // Fondo del encabezado con color institucional
    doc.rect(50, 30, 500, 50)
       .fillAndStroke('#DC143C', '#DC143C'); // Rojo bomberos con borde del mismo color
    
    // Línea superior decorativa
    doc.strokeColor('#DC143C') // Dorado
       .lineWidth(3)
       .moveTo(50, 30)
       .lineTo(550, 30)
       .stroke();
    
    // Agregar logo (si existe)
    try {
      // Intentar cargar el logo desde diferentes ubicaciones posibles
      const fs = require('fs');
      const path = require('path');
      
      const logo = [
        'src/assets/logo.png',
      ];
      
      let logoPath: string | null = null;
      for (const testPath of logo) {
        if (fs.existsSync(testPath)) {
          logoPath = testPath;
          break;
        }
      }
      
              if (logoPath) {
          doc.image(logoPath, 60, 35, {
            width: 40,
            height: 40
          });
          
          // Información institucional (ajustada para el logo) - Texto blanco sobre fondo rojo
          doc.fontSize(14).font('Helvetica-Bold')
             .fillColor('#FFFFFF') // Texto blanco
             .text('CUERPO DE BOMBEROS VOLUNTARIOS MOCOA', 110, 40, { 
               width: 390,
               align: 'center' 
             });
          
          doc.fontSize(9).font('Helvetica')
             .fillColor('#FFFFFF') // Texto blanco
             .text('Barrio jardín calle 17a # 8-34 | Tel: 3176401004 | bomberosmocoa@hotmail.com', 110, 55, { 
               width: 390,
               align: 'center' 
             });
        } else {
          // Sin logo - centrado normal con texto blanco
          doc.fontSize(14).font('Helvetica-Bold')
             .fillColor('#FFFFFF')
             .text('CUERPO DE BOMBEROS VOLUNTARIOS MOCOA', 50, 40, { align: 'center' });
          
          doc.fontSize(9).font('Helvetica')
             .fillColor('#FFFFFF')
             .text('Barrio jardín calle 17a # 8-34 | Tel: 3176401004 | bomberosmocoa@hotmail.com', 50, 55, { align: 'center' });
        }
    } catch (error) {
      console.log('Error cargando logo, continuando sin logo:', error.message);
      
      // Fallback sin logo
      doc.fontSize(14).font('Helvetica-Bold')
         .text('CUERPO DE BOMBEROS VOLUNTARIOS MOCOA', 50, 40, { align: 'center' });
      
      doc.fontSize(9).font('Helvetica')
         .text('Barrio jardín calle 17a # 8-34 | Tel: 3176401004 | bomberosmocoa@hotmail.com', 50, 55, { align: 'center' });
    }
    
    // Línea inferior decorativa
    doc.strokeColor('#b5b5b5') // Dorado
       .lineWidth(3)
       .moveTo(50, 80)
       .lineTo(550, 80)
       .stroke();
    
    // Resetear color de texto a negro para el contenido
    doc.fillColor('#000000');
    
    // Resetear posición Y para el contenido
    doc.y = 95;
  }

  private addFooter(doc: any, pageNum: number): void {
    // Guardar completamente el estado actual del documento
    const currentState = {
      x: doc.x,
      y: doc.y,
      fontSize: doc._fontSize,
      font: doc._font,
      fillColor: doc._fillColor,
      strokeColor: doc._strokeColor,
      lineWidth: doc._lineWidth
    };
    
    // Posición fija del footer en la parte inferior de la página
    const footerY = 740;
    
    // IMPORTANTE: Usar save() y restore() para aislar completamente el footer
    doc.save();
    
    try {
      // Configurar estilo para el footer sin afectar el documento
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#000000')
         .strokeColor('#000000')
         .lineWidth(1);
      
      // Fondo del footer sin degradado
      doc.rect(50, footerY, 500, 30)
         .fillAndStroke('#b5b5b5', '#b5b5b5');
      
      // Línea superior decorativa del footer
      doc.strokeColor('#b5b5b5')
         .lineWidth(2)
         .moveTo(50, footerY)
         .lineTo(550, footerY)
         .stroke();
      
      // Texto del footer - usar posiciones absolutas sin opciones de texto complejas
      const pageText = `Página ${pageNum}`;
      const dateText = `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`;
      const systemText = 'Sistema de Gestión de Emergencias';
      
      // Posicionar texto del footer con mejor estilo
      doc.fillColor('#000000'); // negro para mejor legibilidad
      
      doc.text(`${pageText}`, 60, footerY + 10, { 
        width: 100, 
        height: 12, 
        lineBreak: false,
        continued: false
      });
      
      doc.text(`${dateText}`, 200, footerY + 10, { 
        width: 200, 
        height: 12, 
        lineBreak: false,
        continued: false
      });
      
      doc.text(`${systemText}`, 380, footerY + 10, { 
        width: 150, 
        height: 12, 
        lineBreak: false,
        continued: false
      });
      
      // Línea inferior decorativa del footer
      doc.strokeColor('#b5b5b5')
         .lineWidth(2)
         .moveTo(50, footerY + 30)
         .lineTo(550, footerY + 30)
         .stroke();
         
    } catch (error) {
      console.error('Error dibujando footer:', error);
    } finally {
      // CRÍTICO: Restaurar el estado completo del documento
      doc.restore();
      
      // Asegurar que la posición del cursor no se vea afectada
      doc.x = currentState.x;
      doc.y = Math.min(currentState.y, 720); // Nunca permitir que el contenido invada el área del footer
    }
  }

  private async addImagesToPDF(doc: any, emergency: Emergency, addNewPageCallback: () => void): Promise<void> {
    if (!emergency.emergencyFiles || emergency.emergencyFiles.length === 0) {
      return;
    }

    const imageFiles = emergency.emergencyFiles.filter(file => {
      const extension = file.file.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '');
    });

    if (imageFiles.length === 0) {
      return;
    }

    doc.fontSize(12).font('Helvetica-Bold')
       .text('IMÁGENES DE LA EMERGENCIA', { underline: true });
    doc.moveDown(0.5);

    for (const [index, file] of imageFiles.entries()) {
      try {
        const imageBuffer = await this.downloadImage(file.file);
        
        if (imageBuffer) {
          // Verificar si tenemos espacio en la página actual (considerando pie de página)
          const requiredSpace = 250; // Espacio necesario para imagen + márgenes
          const availableSpace = 720 - doc.y;
          
          if (availableSpace < requiredSpace) {
            addNewPageCallback();
          }

          // Agregar título de la imagen
          doc.fontSize(10).font('Helvetica')
             .text(`Imagen ${index + 1}:`, { continued: false });
          doc.moveDown(0.3);

          // Insertar la imagen con tamaño controlado
          const maxWidth = 250;
          const maxHeight = 200;
          
          doc.image(imageBuffer, {
            fit: [maxWidth, maxHeight],
            align: 'left'
          });
          
          doc.moveDown(1);
        } else {
          // Si no se pudo descargar, mostrar el enlace
          doc.fontSize(9).font('Helvetica')
             .text(`Imagen ${index + 1} (error de carga): ${file.file}`);
          doc.moveDown(0.5);
        }
      } catch (error) {
        console.error(`Error procesando imagen ${file.file}:`, error);
        // Fallback al enlace
        doc.fontSize(9).font('Helvetica')
           .text(`Imagen ${index + 1} (error): ${file.file}`);
        doc.moveDown(0.5);
      }
    }
  }

  async generatePDFReport(filters: ReportFiltersDto): Promise<Buffer> {
    const data = await this.consolidateData(filters);
    
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'LETTER'
        });
        const buffers: Buffer[] = [];
        let currentPageNumber = 1;

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });

        // Función helper para verificar espacio disponible
        const checkPageSpace = (requiredSpace: number = 100) => {
          const availableSpace = 720 - doc.y; // Dejar espacio para footer
          if (availableSpace < requiredSpace) {
            // Agregar footer a página actual
            this.addFooter(doc, currentPageNumber);
            // Crear nueva página
            doc.addPage();
            currentPageNumber++;
            this.addHeader(doc);
          }
        };

        // Función helper para nueva página manual
        const addNewPage = () => {
          // Agregar footer a página actual
          this.addFooter(doc, currentPageNumber);
          // Crear nueva página
          doc.addPage();
          currentPageNumber++;
          this.addHeader(doc);
        };

        // Inicializar la primera página
        this.addHeader(doc);

        // ================================
        // 1. PORTADA Y RESUMEN EJECUTIVO
        // ================================
        
        // Título principal con estilo mejorado
        doc.fontSize(28).font('Helvetica-Bold')
           .fillColor('#DC143C') // Rojo institucional
           .text(filters.reportTitle || 'REPORTE DE EMERGENCIAS', { 
             align: 'center' 
           });
        
        // Línea decorativa bajo el título
        doc.strokeColor('#FFD700')
           .lineWidth(2)
           .moveTo(150, doc.y + 5)
           .lineTo(450, doc.y + 5)
           .stroke();
           
        doc.fillColor('#000000'); // Resetear color
        doc.moveDown(1.5);

        // Período
        doc.fontSize(14).font('Helvetica')
           .text(`Período: ${format(data.period.start, 'dd/MM/yyyy', { locale: es })} - ${format(data.period.end, 'dd/MM/yyyy', { locale: es })}`, { 
             align: 'center' 
           });
        doc.moveDown(0.5);

        // Fecha de generación
        doc.fontSize(10)
           .text(`Generado el: ${format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}`, { 
             align: 'center' 
           });
        doc.moveDown(2);

        // Resumen ejecutivo con caja de color
        const resumenY = doc.y;
        doc.rect(50, resumenY, 500, 120)
           .fillAndStroke('#F8F8FF', '#F8F8FF'); // Fondo gris claro con borde del mismo color
        
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#DC143C')
           .text('RESUMEN EJECUTIVO', 60, resumenY + 10);
        
        doc.fontSize(12).font('Helvetica')
           .fillColor('#000000')
           .text(`Total de emergencias atendidas: ${data.totalEmergencies}`, 60, resumenY + 35)
           .text(`Tiempo promedio de respuesta: ${data.averageResponseTime}`, 60, resumenY + 55);
        
        // Agregar métricas avanzadas si están disponibles
        if (data.advancedStats && data.advancedStats.mostCommonEmergencyType) {
          doc.text(`Tipo más frecuente: ${data.advancedStats.mostCommonEmergencyType.type} (${data.advancedStats.mostCommonEmergencyType.count} casos)`, 60, resumenY + 75);
          
          if (data.advancedStats.timeAnalysis) {
            const cumplimiento = data.advancedStats.timeAnalysis.emergenciesWithinTargetPercentage;
            const cumplimientoColor = cumplimiento >= 80 ? '#28a745' : cumplimiento >= 60 ? '#ffc107' : '#dc3545';
            doc.fillColor(cumplimientoColor)
               .text(`Cumplimiento del objetivo (${data.advancedStats.timeAnalysis.targetTime} min): ${cumplimiento}%`, 60, resumenY + 95);
            doc.fillColor('#000000'); // Resetear color
          }
        }
        
        doc.y = resumenY + 130;

        // ================================
        // 2. RESUMEN ESTADÍSTICO
        // ================================
        
        // Sección de tipos de emergencia
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#DC143C')
           .text('DISTRIBUCIÓN POR TIPO DE EMERGENCIA');
        
        // Línea decorativa
        doc.strokeColor('#FFD700')
           .lineWidth(1)
           .moveTo(50, doc.y + 5)
           .lineTo(550, doc.y + 5)
           .stroke();
        doc.moveDown(1);

        doc.fontSize(11).font('Helvetica')
           .fillColor('#000000');
        data.emergenciesByType.forEach((stat, index) => {
          const barWidth = (stat.count / data.totalEmergencies) * 200;
          const currentY = doc.y;
          
          // Barra de progreso visual
          doc.rect(50, currentY, barWidth, 8)
             .fillAndStroke('#DC143C', '#DC143C');
          
          doc.text(`${stat.type}: ${stat.count} casos (${stat.percentage}%)`, 260, currentY - 2);
          doc.moveDown(0.7);
        });
        doc.moveDown(1);

        // Sección de operadores
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#DC143C')
           .text('DISTRIBUCIÓN POR OPERADOR');
        
        // Línea decorativa
        doc.strokeColor('#FFD700')
           .lineWidth(1)
           .moveTo(50, doc.y + 5)
           .lineTo(550, doc.y + 5)
           .stroke();
        doc.moveDown(1);

        doc.fontSize(11).font('Helvetica')
           .fillColor('#000000');
        data.emergenciesByUser.forEach((stat, index) => {
          const barWidth = (stat.count / data.totalEmergencies) * 200;
          const currentY = doc.y;
          
          // Barra de progreso visual
          doc.rect(50, currentY, barWidth, 8)
             .fillAndStroke('#4169E1', '#4169E1');
          
          doc.text(`${stat.user}: ${stat.count} casos (${stat.percentage}%)`, 260, currentY - 2);
          doc.moveDown(0.7);
        });

        // ================================
        // ANÁLISIS DE TIEMPOS DE RESPUESTA
        // ================================
        
        checkPageSpace(200);
        doc.moveDown(1);
        
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#DC143C')
           .text('ANÁLISIS DE TIEMPOS DE RESPUESTA');
        
        // Línea decorativa
        doc.strokeColor('#FFD700')
           .lineWidth(1)
           .moveTo(50, doc.y + 5)
           .lineTo(550, doc.y + 5)
           .stroke();
        doc.moveDown(1);

        if (data.advancedStats && data.advancedStats.timeAnalysis) {
          const timeAnalysis = data.advancedStats.timeAnalysis;
          
          // Caja de métricas principales
          const metricsY = doc.y;
          doc.rect(50, metricsY, 500, 120)
             .fillAndStroke('#F0F8FF', '#E0E0E0');
          
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#DC143C')
             .text('MÉTRICAS DE PERFORMANCE', 60, metricsY + 10);
          
          doc.fontSize(10).font('Helvetica')
             .fillColor('#000000')
             .text(`Tiempo Objetivo: ${timeAnalysis.targetTime} minutos`, 60, metricsY + 35)
             .text(`Tiempo Promedio: ${timeAnalysis.averageTime} minutos`, 60, metricsY + 50)
             .text(`Tiempo Mínimo: ${timeAnalysis.minTime} minutos`, 60, metricsY + 65)
             .text(`Tiempo Máximo: ${timeAnalysis.maxTime} minutos`, 60, metricsY + 80);
          
          // Métricas de cumplimiento
          doc.text(`Emergencias dentro del objetivo: ${timeAnalysis.emergenciesWithinTarget} (${timeAnalysis.emergenciesWithinTargetPercentage}%)`, 300, metricsY + 35)
             .text(`Emergencias fuera del objetivo: ${timeAnalysis.emergenciesOverTarget} (${timeAnalysis.emergenciesOverTargetPercentage}%)`, 300, metricsY + 50);
          
          // Indicador visual de cumplimiento
          const targetPercentage = timeAnalysis.emergenciesWithinTargetPercentage;
          const indicatorColor = targetPercentage >= 80 ? '#28a745' : targetPercentage >= 60 ? '#ffc107' : '#dc3545';
          
          doc.rect(300, metricsY + 70, 200, 15)
             .fillAndStroke('#e9ecef', '#dee2e6');
          
          doc.rect(300, metricsY + 70, (targetPercentage / 100) * 200, 15)
             .fillAndStroke(indicatorColor, indicatorColor);
          
          doc.fontSize(8).font('Helvetica')
             .fillColor('#000000')
             .text(`${targetPercentage}% de cumplimiento`, 300, metricsY + 95);
          
          doc.y = metricsY + 130;
        }

        // ================================
        // TENDENCIAS MENSUALES
        // ================================
        
        checkPageSpace(250);
        doc.moveDown(1);
        
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#DC143C')
           .text('TENDENCIAS MENSUALES');
        
        // Línea decorativa
        doc.strokeColor('#FFD700')
           .lineWidth(1)
           .moveTo(50, doc.y + 5)
           .lineTo(550, doc.y + 5)
           .stroke();
        doc.moveDown(1);

        if (data.advancedStats && data.advancedStats.monthlyTrends) {
          const trends = data.advancedStats.monthlyTrends;
          const maxEmergencies = Math.max(...trends.map(t => t.totalEmergencies), 1);
          
          doc.fontSize(11).font('Helvetica')
             .fillColor('#000000');
          
          trends.forEach((trend, index) => {
            checkPageSpace(25);
            const barWidth = (trend.totalEmergencies / maxEmergencies) * 250;
            const currentY = doc.y;
            
            // Mes y año
            const monthYear = `${trend.month} ${trend.year}`;
            doc.text(monthYear, 50, currentY);
            
            // Barra de progreso
            doc.rect(180, currentY, Math.max(barWidth, 5), 12)
               .fillAndStroke('#17a2b8', '#17a2b8');
            
            // Valores
            doc.text(`${trend.totalEmergencies} emergencias`, 440, currentY);
            doc.text(`${trend.averageResponseTime}`, 440, currentY + 12);
            
            doc.moveDown(1);
          });
        }

        // Nueva página para el detalle
        addNewPage();

        // ================================
        // 3. DETALLE DE EMERGENCIAS
        // ================================
        
        doc.fontSize(18).font('Helvetica-Bold')
           .text('DETALLE DE EMERGENCIAS', { align: 'center' });
        doc.moveDown(1);


        
        if (data.emergencies.length === 0) {
          doc.fontSize(12).font('Helvetica')
             .text('No se encontraron emergencias para el período seleccionado.', { align: 'center' });
          doc.moveDown(2);
        }

        // Procesar cada emergencia de forma secuencial
        for (let index = 0; index < data.emergencies.length; index++) {
          const emergency = data.emergencies[index];
          
          // Nueva página para cada emergencia (excepto la primera)
          if (index > 0) {
            addNewPage();
          }

          // A. Información General
          doc.fontSize(14).font('Helvetica-Bold')
             .text(`EMERGENCIA #${emergency.emergencyId}`, { underline: true });
          doc.moveDown(0.5);

          doc.fontSize(10).font('Helvetica');
          doc.text(`Fecha: ${format(new Date(emergency.emergencyDate), 'dd/MM/yyyy HH:mm', { locale: es })}`);
          doc.text(`Tipo: ${emergency.emergencyType.emergencyType}`);
          doc.text(`Informante: ${emergency.informant}`);
          doc.text(`Ubicación: ${emergency.ubication}`);
          doc.text(`Turno: ${emergency.turn}`);
          doc.text(`Vehículo: ${emergency.vehicles.map(v => v.name).join(', ')}`);
          doc.text(`Personal de Guardia: ${emergency.guardPersonnel}`);
          doc.text(`Unidades de Respuesta: ${emergency.unitsResponse}`);
          doc.text(`Operador: ${emergency.user.email}`);
          doc.moveDown(1);

          // B. Cronología de Eventos
          checkPageSpace(150); // Verificar espacio para la sección
          doc.fontSize(12).font('Helvetica-Bold')
             .text('CRONOLOGÍA DE EVENTOS', { underline: true });
          doc.moveDown(0.5);

          const narrative = this.generateEmergencyNarrative(emergency);
          doc.fontSize(9).font('Helvetica')
             .text(narrative, { 
               width: 500,
               lineGap: 3
             });
          doc.moveDown(1);

          // C. Novedades Adicionales
          checkPageSpace(100); // Verificar espacio para la sección
          doc.fontSize(12).font('Helvetica-Bold')
             .text('NOVEDADES ADICIONALES', { underline: true });
          doc.moveDown(0.5);

          const novelties = this.generateNoveltiesText(emergency);
          doc.fontSize(9).font('Helvetica')
             .text(novelties, { 
               width: 500,
               lineGap: 3
             });
          doc.moveDown(1);

          // D. Imágenes y archivos adjuntos
          checkPageSpace(80); // Verificar espacio para título de sección
          await this.addImagesToPDF(doc, emergency, addNewPage);

          // Mostrar archivos no-imagen como enlaces
          const nonImageFiles = emergency.emergencyFiles?.filter(file => {
            const extension = file.file.toLowerCase().split('.').pop();
            return !['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '');
          }) || [];

          if (nonImageFiles.length > 0) {
            checkPageSpace(60 + (nonImageFiles.length * 15)); // Espacio para título + archivos
            doc.fontSize(12).font('Helvetica-Bold')
               .text('OTROS ARCHIVOS ADJUNTOS', { underline: true });
            doc.moveDown(0.5);

            doc.fontSize(9).font('Helvetica');
            nonImageFiles.forEach((file, fileIndex) => {
              doc.text(`Archivo ${fileIndex + 1}: ${file.file}`);
            });
            doc.moveDown(1);
          }

          // Línea separadora
          doc.strokeColor('#cccccc')
             .lineWidth(1)
             .moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke();
        }

        // Agregar footer a la última página
        this.addFooter(doc, currentPageNumber);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }


} 