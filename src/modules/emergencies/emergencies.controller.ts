import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EmergenciesService } from './emergencies.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';
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
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createEmergencyDto: CreateEmergencyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let fileUrl: string | undefined = undefined;
    if (file) {
      const uploadResult = await this.cloudinaryService.uploadImage(file);
      fileUrl = uploadResult.secure_url;
    }
    return this.emergenciesService.create(createEmergencyDto, fileUrl);
  }

  @Get()
  @Roles(ROLES.OPERADOR, ROLES.ADMIN)
  findAll() {
    return this.emergenciesService.findAll();
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

  @Delete(':id')
  @Roles(ROLES.ADMIN)
  remove(@Param('id') id: string) {
    return this.emergenciesService.remove(+id);
  }
} 