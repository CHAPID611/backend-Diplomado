import { Controller, Get, Post, Body, Param, Delete, Put, Patch, UseGuards, UseInterceptors, UploadedFiles, Query, Request, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { EmergenciesService } from './emergencies.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';
import { EditEmergencyDto } from './dto/edit-emergency.dto';
import { QueryEmergencyDto } from './dto/query-emergency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';
import { CloudinaryService } from './cloudinary.service';

@Controller('emergencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmergenciesController {
  constructor(
    private readonly emergenciesService: EmergenciesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  @UseInterceptors(FilesInterceptor('file'))
  async create(
    @Body() createEmergencyDto: CreateEmergencyDto | { data: string },
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ }),
        ],
        fileIsRequired: false,
      }),
    ) files?: Express.Multer.File[],
  ) {
    // Si los datos vienen como string (FormData), parsearlos
    const emergencyData = typeof createEmergencyDto === 'object' && 'data' in createEmergencyDto
      ? JSON.parse(createEmergencyDto.data)
      : createEmergencyDto;

    // Procesar archivos con Cloudinary si existen
    const uploadedFiles = files && files.length > 0 
      ? await Promise.all(files.map(file => this.cloudinaryService.uploadImage(file)))
      : [];

    return this.emergenciesService.create(emergencyData, uploadedFiles);
  }

  @Get()
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findAll(@Query() query: QueryEmergencyDto) {
    return this.emergenciesService.findAll(query);
  }

  @Get(':id')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findOne(@Param('id') id: string) {
    return this.emergenciesService.findOne(+id);
  }

  @Put(':id')
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  update(@Param('id') id: string, @Body() updateEmergencyDto: UpdateEmergencyDto) {
    return this.emergenciesService.update(+id, updateEmergencyDto);
  }

  @Patch(':id')
  @Roles(ROLES.ADMIN)
  editEmergency(@Param('id') id: string, @Body() editEmergencyDto: EditEmergencyDto, @Request() req: any) {
    return this.emergenciesService.editEmergency(+id, editEmergencyDto, req.user);
  }

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  remove(@Param('id') id: string) {
    return this.emergenciesService.remove(+id);
  }
} 