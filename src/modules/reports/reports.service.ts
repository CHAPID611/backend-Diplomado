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
      .leftJoinAndSelect('emergency.vehicles', 'vehicles')
      .leftJoinAndSelect('emergency.personnel', 'personnel')
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
        description: `${time} - Personal de guardia se dirige al lugar del incidente. ${emergency.vehicles?.map(v => v.name).join(', ') || 'Unidades'} despachado con ${emergency.guardPersonnel}. ${emergency.departureTimeDescription || ''}`
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

  private addHeader(doc: any, pageNum: number = 1, totalPages: number = 1): void {
    // Encabezado oficial de Bomberos de Colombia
    const startY = 30;
    
    // Fondo del encabezado con color azul oficial
    doc.rect(50, startY, 500, 90)
       .fillAndStroke('#1e3a8a', '#1e3a8a'); // Azul institucional
    
    // Agregar logo (si existe)
    try {
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
        // Logo en la esquina superior izquierda
        doc.image(logoPath, 60, startY + 10, {
          width: 70,
          height: 60
        });
        
        // Textos institucionales con logo
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text('BOMBEROS DE COLOMBIA', 120, startY + 15, { 
             width: 360,
             align: 'center' 
           });
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text('CUERPO DE BOMBEROS VOLUNTARIOS DE MOCOA', 120, startY + 35, { 
             width: 360,
             align: 'center' 
           });
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#FFFFFF')
           .text('COMANDANTE', 120, startY + 55, { 
             width: 360,
             align: 'center' 
           });
      } else {
        // Sin logo - texto centrado
        doc.fontSize(16).font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text('BOMBEROS DE COLOMBIA', 50, startY + 15, { 
             width: 500,
             align: 'center' 
           });
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#FFFFFF')
           .text('CUERPO DE BOMBEROS VOLUNTARIOS DE MOCOA', 50, startY + 35, { 
             width: 500,
             align: 'center' 
           });
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#FFFFFF')
           .text('COMANDANTE', 50, startY + 55, { 
             width: 500,
             align: 'center' 
           });
      }
    } catch (error) {
      console.log('Error cargando logo, continuando sin logo:', error.message);
      
      // Fallback sin logo
      doc.fontSize(16).font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text('BOMBEROS DE COLOMBIA', 50, startY + 15, { 
           width: 500,
           align: 'center' 
         });
      
      doc.fontSize(12).font('Helvetica-Bold')
         .fillColor('#FFFFFF')
         .text('CUERPO DE BOMBEROS VOLUNTARIOS DE MOCOA', 50, startY + 35, { 
           width: 500,
           align: 'center' 
         });
      
      doc.fontSize(10).font('Helvetica')
         .fillColor('#FFFFFF')
         .text('COMANDANTE', 50, startY + 55, { 
           width: 500,
           align: 'center' 
         });
    }
    
    // Tabla de información de documento (parte inferior del encabezado)
    const tableStartY = startY + 70;
    const tableHeight = 20;
    
    // Fondo blanco para la tabla
    doc.rect(50, tableStartY, 500, tableHeight)
       .fillAndStroke('#FFFFFF', '#000000');
    
    // Configurar para texto de la tabla
    doc.fontSize(8).font('Helvetica')
       .fillColor('#000000');
    
    // Columnas de la tabla
    const colWidths = [70, 90, 70, 40, 70, 70, 60]; // CÓDIGO, OP-FT-001, VERSIÓN, 0.1, VIGENCIA, 2025, Página, Pág. X de Y
    let currentX = 50;
    
    // Líneas verticales y contenido
    for (let i = 0; i < 7; i++) {
      if (i > 0) {
        // Línea vertical
        doc.moveTo(currentX, tableStartY)
           .lineTo(currentX, tableStartY + tableHeight)
           .stroke();
      }
      
      let text = '';
      switch (i) {
        case 0:
          text = 'CÓDIGO';
          break;
        case 1:
          text = 'OP-FT-001';
          break;
        case 2:
          text = 'VERSIÓN';
          break;
        case 3:
          text = '0.1';
          break;
        case 4:
          text = 'VIGENCIA';
          break;
        case 5:
          text = '2025';
          break;
        case 6:
          text = `Pág. ${pageNum} de ${totalPages}`;
          break;
      }
      
      // Texto centrado en cada celda
      doc.text(text, currentX + 3, tableStartY + 6, {
        width: colWidths[i] - 6,
        align: 'center',
        lineBreak: false
      });
      
      currentX += colWidths[i];
    }
    
    // Línea horizontal inferior de la tabla
    doc.moveTo(50, tableStartY + tableHeight)
       .lineTo(550, tableStartY + tableHeight)
       .stroke();
    
    // Resetear color de texto a negro para el contenido
    doc.fillColor('#000000');
    
    // Resetear posición Y para el contenido (después del encabezado)
    doc.y = startY + 105;
    
    // Resetear el cursor X para evitar interferencia del logo
    doc.x = 50;
  }

  private addFooter(doc: any): void {
    // Guardar el estado actual del documento para restaurarlo después
    const currentY = doc.y;
    const currentFillColor = doc._fillColor;
    const currentStrokeColor = doc._strokeColor;
    const currentFontSize = doc._fontSize;
    
    // Posición fija del footer desde el bottom de la página
    const footerY = doc.page.height - 60; // 60px desde abajo
    const footerHeight = 60;
    const lineHeight = 10;
    const lines = [
      '"CONVICCIÓN – DECISIÓN – COMPAÑERISMO - DISCIPLINA"',
      'N° Emergencias: Tel.: 429 5034 – 3176401004, 119 (movistar) Estación central',
      'Calle 17A No. 8-34 Barrio Jardín – Mocoa',
      'Correo Electrónico: Bomberosmocoa@hotmail.com'
    ];
  
    // Fondo del footer con posición absoluta
    doc.rect(50, footerY, 500, footerHeight)
       .fillAndStroke('#F0F0F0', '#F0F0F0');
  
    // Configurar texto del footer
    doc.fillColor('#000000')
       .fontSize(8)
       .font('Helvetica');
  
    // Calcular posición centrada del texto
    const totalTextHeight = lines.length * lineHeight;
    const textStartY = footerY + (footerHeight - totalTextHeight) / 2;
  
    // Dibujar cada línea del footer con posición absoluta y control manual
    const tempY = doc.y; // Guardar posición actual del documento
    
    lines.forEach((text, index) => {
      const lineY = textStartY + (index * lineHeight);
      
      // Aplicar negrita al primer renglón
      if (index === 0) {
        doc.font('Helvetica-Bold');
        doc.fontSize(10);
      } else {
        doc.font('Helvetica');
      }
      
      // Calcular el ancho del texto para centrarlo manualmente
      const textWidth = doc.widthOfString(text, { fontSize: 8 });
      const startX = 50 + (500 - textWidth) / 2; // Centrar manualmente
      
      // Dibujar el texto en posición absoluta sin afectar el flujo del documento
      doc.text(text, startX, lineY, {
        lineBreak: false,
        continued: false,
        width: textWidth,
        height: lineHeight
      });
    });
    
    // Restaurar la posición Y original para no afectar el flujo del documento
    // Asegurar que el contenido no invada el área del footer
    doc.y = Math.min(currentY, footerY - 10);
    
    // Restaurar colores de manera segura
    try {
      if (currentFillColor) doc.fillColor(currentFillColor);
      if (currentStrokeColor) doc.strokeColor(currentStrokeColor);
      if (currentFontSize && currentFontSize > 0) doc.fontSize(currentFontSize);
    } catch (error) {
      // Si hay error restaurando el estado, usar valores por defecto seguros
      doc.fillColor('#000000');
      doc.fontSize(12);
      console.warn('Error restaurando estado en footer, usando valores por defecto:', error.message);
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
          const availableSpace = 700 - doc.y; // Dejar espacio para footer (posición 720)
          
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

  async generateEmergencyReport(filters: ReportFiltersDto): Promise<Buffer> {
    console.log('ReportsService: Iniciando generateEmergencyReport con filtros:', filters);
    const data = await this.consolidateData(filters);
    console.log('ReportsService: Datos consolidados obtenidos, emergencias encontradas:', data.emergencies.length);
    
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

        // Estimar número total de páginas
        let totalPagesEstimate = Math.max(data.emergencies.length + 1, 3);

        // Función helper para nueva página manual
        const addNewPage = () => {
          this.addFooter(doc);
          doc.addPage();
          currentPageNumber++;
          this.addHeader(doc, currentPageNumber, totalPagesEstimate);
        };

        // Inicializar la primera página
        this.addHeader(doc, currentPageNumber, totalPagesEstimate);

        // Asegurar posicionamiento correcto después del encabezado
        doc.x = 50;
        
        // Título principal
        doc.fontSize(20).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('REPORTE DE EMERGENCIAS', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        // Línea decorativa
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(200, doc.y + 8)
           .lineTo(400, doc.y + 8)
           .stroke();
        doc.moveDown(1.5);

        // Período
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`Período: ${format(data.period.start, 'dd/MM/yyyy', { locale: es })} - ${format(data.period.end, 'dd/MM/yyyy', { locale: es })}`, 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        doc.moveDown(0.8);

        // Fecha de generación
        doc.fontSize(10).font('Helvetica')
           .text(`Generado el: ${format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}`, 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        doc.moveDown(2);

        // Resumen básico
        const resumenY = doc.y;
        doc.rect(50, resumenY, 500, 60)
           .fillAndStroke('#F5F5F5', '#000000');
        
        doc.fontSize(12).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('RESUMEN', 60, resumenY + 15);
        
        doc.fontSize(10).font('Helvetica')
           .fillColor('#000000')
           .text(`Total de emergencias atendidas: ${data.totalEmergencies}`, 60, resumenY + 35);
        
        // Tipo más frecuente
        if (data.emergenciesByType.length > 0) {
          const mostFrequent = data.emergenciesByType[0];
          doc.text(`Tipo más frecuente: ${mostFrequent.type} (${mostFrequent.count} casos)`, 300, resumenY + 35);
        }
        
        doc.y = resumenY + 70;
        doc.moveDown(2);

        // Detalle de emergencias
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('DETALLE DE EMERGENCIAS', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(150, doc.y + 8)
           .lineTo(450, doc.y + 8)
           .stroke();
        doc.moveDown(1.5);

        if (data.emergencies.length === 0) {
          doc.fontSize(12).font('Helvetica')
             .text('No se encontraron emergencias para el período seleccionado.', 50, doc.y, { 
               width: 500,
               align: 'center' 
             });
          doc.moveDown(2);
        }

        // Procesar cada emergencia
        for (let index = 0; index < data.emergencies.length; index++) {
          const emergency = data.emergencies[index];
          
          // Nueva página para cada emergencia (excepto la primera)
          if (index > 0) {
            addNewPage();
          }

          // Información General
          doc.fontSize(13).font('Helvetica-Bold')
             .fillColor('#000000')
             .text(`EMERGENCIA #${emergency.emergencyId}`, { underline: true });
          doc.moveDown(0.8);

          doc.fontSize(10).font('Helvetica')
             .fillColor('#000000');
          doc.text(`Fecha: ${format(new Date(emergency.emergencyDate), 'dd/MM/yyyy HH:mm', { locale: es })}`);
          doc.text(`Tipo: ${emergency.emergencyType.emergencyType}`);
          doc.text(`Informante: ${emergency.informant}`);
          doc.text(`Ubicación: ${emergency.ubication}`);
          doc.text(`Turno: ${emergency.turn}`);
          doc.text(`Vehículo: ${emergency.vehicles?.map(v => v.name).join(', ') || 'No especificado'}`);
          doc.text(`Personal de Guardia: ${emergency.guardPersonnel}`);
          doc.text(`Unidades de Respuesta: ${emergency.unitsResponse}`);
          doc.text(`Operador: ${emergency.user.email}`);
          doc.moveDown(1);

          // Cronología de Eventos
          doc.fontSize(11).font('Helvetica-Bold')
             .fillColor('#000000')
             .text('CRONOLOGÍA DE EVENTOS', { underline: true });
          doc.moveDown(0.8);

          const narrative = this.generateEmergencyNarrative(emergency);
          doc.fontSize(9).font('Helvetica')
             .fillColor('#000000')
             .text(narrative, { 
               width: 500,
               lineGap: 4
             });
          doc.moveDown(1.2);

          // Novedades Adicionales
          doc.fontSize(11).font('Helvetica-Bold')
             .fillColor('#000000')
             .text('NOVEDADES ADICIONALES', { underline: true });
          doc.moveDown(0.8);

          const novelties = this.generateNoveltiesText(emergency);
          doc.fontSize(9).font('Helvetica')
             .fillColor('#000000')
             .text(novelties, { 
               width: 500,
               lineGap: 4
             });
          doc.moveDown(1);

          // Imágenes y archivos adjuntos
          await this.addImagesToPDF(doc, emergency, addNewPage);

          // Mostrar archivos no-imagen
          const nonImageFiles = emergency.emergencyFiles?.filter(file => {
            const extension = file.file.toLowerCase().split('.').pop();
            return !['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension || '');
          }) || [];

          if (nonImageFiles.length > 0) {
            doc.fontSize(11).font('Helvetica-Bold')
               .fillColor('#000000')
               .text('OTROS ARCHIVOS ADJUNTOS', { underline: true });
            doc.moveDown(0.8);

            doc.fontSize(9).font('Helvetica')
               .fillColor('#000000');
            nonImageFiles.forEach((file, fileIndex) => {
              doc.text(`Archivo ${fileIndex + 1}: ${file.file}`);
            });
            doc.moveDown(1.2);
          }

          // Línea separadora
          if (index < data.emergencies.length - 1) {
            doc.strokeColor('#000000')
               .lineWidth(0.5)
               .moveTo(100, doc.y)
               .lineTo(500, doc.y)
               .stroke();
          }
        }

        // Footer en la última página
        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async generateStatisticsReport(filters: ReportFiltersDto): Promise<Buffer> {
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

        // Estimar número total de páginas (se actualizará dinámicamente)
        let totalPagesEstimate = Math.max(data.emergencies.length + 3, 5); // Mínimo 5 páginas

        // Función helper para verificar espacio disponible
        const checkPageSpace = (requiredSpace: number = 100) => {
          const maxContentBottom = 720;
          const availableSpaceBottom = maxContentBottom - doc.y;

          if (availableSpaceBottom < requiredSpace) {
            // Agregar footer a la página actual antes de cambiar
            this.addFooter(doc);
            // Crear nueva página
            doc.addPage();
            currentPageNumber++;
            totalPagesEstimate = Math.max(totalPagesEstimate, currentPageNumber + 2);
            this.addHeader(doc, currentPageNumber, totalPagesEstimate);
          }
        };

        // Función helper para nueva página manual
        const addNewPage = () => {
          // Agregar footer a la página actual
          this.addFooter(doc);
          // Crear nueva página
          doc.addPage();
          currentPageNumber++;
          this.addHeader(doc, currentPageNumber, totalPagesEstimate);
        };

        // Inicializar la primera página
        this.addHeader(doc, currentPageNumber, totalPagesEstimate);

        // ================================
        // 1. PORTADA Y RESUMEN EJECUTIVO
        // ================================
        
        // Asegurar posicionamiento correcto después del encabezado
        doc.x = 50;
        
        // Título principal formal
        doc.fontSize(22).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('REPORTE DE ESTADÍSTICAS DE EMERGENCIAS', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        // Línea decorativa discreta bajo el título
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(200, doc.y + 8)
           .lineTo(400, doc.y + 8)
           .stroke();
           
        doc.moveDown(1.5);

        // Período
        doc.fontSize(12).font('Helvetica-Bold')
           .text(`Período: ${format(data.period.start, 'dd/MM/yyyy', { locale: es })} - ${format(data.period.end, 'dd/MM/yyyy', { locale: es })}`, 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        doc.moveDown(0.8);

        // Fecha de generación
        doc.fontSize(10).font('Helvetica')
           .text(`Generado el: ${format(data.generatedAt, 'dd/MM/yyyy HH:mm', { locale: es })}`, 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        doc.moveDown(2);

        // Resumen ejecutivo con estilo formal
        const resumenY = doc.y;
        doc.rect(50, resumenY, 500, 120)
           .fillAndStroke('#F5F5F5', '#000000'); // Fondo gris claro con borde negro
        
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('RESUMEN EJECUTIVO', 60, resumenY + 15);
        
        doc.fontSize(11).font('Helvetica')
           .fillColor('#000000')
           .text(`Total de emergencias atendidas: ${data.totalEmergencies}`, 60, resumenY + 40)
           .text(`Tiempo promedio de respuesta: ${data.averageResponseTime}`, 60, resumenY + 60);
        
        // Agregar métricas avanzadas si están disponibles
        if (data.advancedStats && data.advancedStats.mostCommonEmergencyType) {
          doc.text(`Tipo más frecuente: ${data.advancedStats.mostCommonEmergencyType.type} (${data.advancedStats.mostCommonEmergencyType.count} casos)`, 60, resumenY + 80);
          
          if (data.advancedStats.timeAnalysis) {
            const cumplimiento = data.advancedStats.timeAnalysis.emergenciesWithinTargetPercentage;
            doc.text(`Cumplimiento del objetivo (${data.advancedStats.timeAnalysis.targetTime} min): ${cumplimiento}%`, 60, resumenY + 100);
          }
        }
        
        doc.y = resumenY + 130;

        // ================================
        // 2. RESUMEN ESTADÍSTICO
        // ================================
        
        // Sección de tipos de emergencia
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('DISTRIBUCIÓN POR TIPO DE EMERGENCIA', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        // Línea decorativa
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(150, doc.y + 8)
           .lineTo(450, doc.y + 8)
           .stroke();
        doc.moveDown(1.2);

        doc.fontSize(10).font('Helvetica')
           .fillColor('#000000');
        data.emergenciesByType.forEach((stat, index) => {
          const barWidth = (stat.count / data.totalEmergencies) * 180;
          const currentY = doc.y;
          
          // Barra de progreso visual en escala de grises
          doc.rect(70, currentY, barWidth, 10)
             .fillAndStroke('#666666', '#000000');
          
          doc.text(`${stat.type}: ${stat.count} casos (${stat.percentage}%)`, 270, currentY + 1);
          doc.moveDown(0.8);
        });
        doc.moveDown(2);

        // ================================
        // ANÁLISIS DE TIEMPOS DE RESPUESTA
        // ================================
        
        checkPageSpace(200);
        doc.moveDown(1.5);
        
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('ANÁLISIS DE TIEMPOS DE RESPUESTA', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        // Línea decorativa
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(150, doc.y + 8)
           .lineTo(450, doc.y + 8)
           .stroke();
        doc.moveDown(1.2);

        if (data.advancedStats && data.advancedStats.timeAnalysis) {
          const timeAnalysis = data.advancedStats.timeAnalysis;
          
          // Caja de métricas principales
          const metricsY = doc.y;
          doc.rect(50, metricsY, 500, 120)
             .fillAndStroke('#F5F5F5', '#000000');
          
          doc.fontSize(12).font('Helvetica-Bold')
             .fillColor('#000000')
             .text('MÉTRICAS DE PERFORMANCE', 60, metricsY + 12);
          
          doc.fontSize(10).font('Helvetica')
             .fillColor('#000000')
             .text(`Tiempo Objetivo: ${timeAnalysis.targetTime} minutos`, 60, metricsY + 35)
             .text(`Tiempo Promedio: ${timeAnalysis.averageTime} minutos`, 60, metricsY + 50)
             .text(`Tiempo Mínimo: ${timeAnalysis.minTime} minutos`, 60, metricsY + 65)
             .text(`Tiempo Máximo: ${timeAnalysis.maxTime} minutos`, 60, metricsY + 80);
          
          // Métricas de cumplimiento
          doc.text(`Emergencias dentro del objetivo: ${timeAnalysis.emergenciesWithinTarget} (${timeAnalysis.emergenciesWithinTargetPercentage}%)`, 300, metricsY + 35)
             .text(`Emergencias fuera del objetivo: ${timeAnalysis.emergenciesOverTarget} (${timeAnalysis.emergenciesOverTargetPercentage}%)`, 300, metricsY + 50);
          
          // Indicador visual de cumplimiento en escala de grises
          const targetPercentage = timeAnalysis.emergenciesWithinTargetPercentage;
          
          doc.rect(300, metricsY + 70, 200, 15)
             .fillAndStroke('#DDDDDD', '#000000');
          
          doc.rect(300, metricsY + 70, (targetPercentage / 100) * 200, 15)
             .fillAndStroke('#666666', '#000000');
          
          doc.fontSize(9).font('Helvetica-Bold')
             .fillColor('#000000')
             .text(`${targetPercentage}% de cumplimiento`, 300, metricsY + 95);
          
          doc.y = metricsY + 130;
        }

        // ================================
        // TENDENCIAS MENSUALES
        // ================================
        
        checkPageSpace(250);
        doc.moveDown(1.5);
        
        doc.fontSize(14).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('TENDENCIAS MENSUALES', 50, doc.y, { 
             width: 500,
             align: 'center' 
           });
        
        // Línea decorativa
        doc.strokeColor('#000000')
           .lineWidth(1)
           .moveTo(150, doc.y + 8)
           .lineTo(450, doc.y + 8)
           .stroke();
        doc.moveDown(1.2);

        if (data.advancedStats && data.advancedStats.monthlyTrends) {
          const trends = data.advancedStats.monthlyTrends;
          const maxEmergencies = Math.max(...trends.map(t => t.totalEmergencies), 1);
          
          doc.fontSize(10).font('Helvetica')
             .fillColor('#000000');
          
          trends.forEach((trend, index) => {
            checkPageSpace(30);
            const barWidth = (trend.totalEmergencies / maxEmergencies) * 200;
            const currentY = doc.y;
            
            // Mes y año con formato mejorado
            const monthYear = `${trend.month} ${trend.year}`;
            doc.font('Helvetica-Bold').text(monthYear, 60, currentY);
            
            // Barra de progreso en escala de grises
            doc.rect(200, currentY + 2, Math.max(barWidth, 8), 10)
               .fillAndStroke('#999999', '#000000');
            
            // Valores
            doc.font('Helvetica').text(`${trend.totalEmergencies} emergencias`, 420, currentY);
            doc.text(`Promedio: ${trend.averageResponseTime}`, 420, currentY + 12);
            
            doc.moveDown(1.2);
          });
        }



        // Agregar footer a la última página
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }


} 