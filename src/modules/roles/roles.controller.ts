import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from './constants/roles.constants';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo rol' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ApiResponse({ status: 200, description: 'Lista de roles obtenida exitosamente' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Obtener un rol por ID' })
  @ApiResponse({ status: 200, description: 'Rol encontrado exitosamente' })
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  @Get(':id/users')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Obtener usuarios por rol' })
  @ApiResponse({ status: 200, description: 'Usuarios encontrados exitosamente' })
  getUsersByRole(@Param('id') id: string) {
    return this.rolesService.getUsersByRole(+id);
  }

  @Post(':userId/assign/:roleId')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Asignar un rol a un usuario' })
  @ApiResponse({ status: 200, description: 'Rol asignado exitosamente' })
  assignRoleToUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.assignRoleToUser(+userId, +roleId);
  }

  @Delete(':userId/remove/:roleId')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Remover un rol de un usuario' })
  @ApiResponse({ status: 200, description: 'Rol removido exitosamente' })
  removeRoleFromUser(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rolesService.removeRoleFromUser(+userId, +roleId);
  }

  @Get('user/:userId')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Obtener roles de un usuario' })
  @ApiResponse({ status: 200, description: 'Roles del usuario obtenidos exitosamente' })
  getUserRoles(@Param('userId') userId: string) {
    return this.rolesService.getUserRoles(+userId);
  }
} 