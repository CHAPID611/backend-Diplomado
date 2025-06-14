import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { UserRole } from '../auth/entities/user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { ROLES } from './constants/roles.constants';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRolesRepository: Repository<UserRole>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException('El rol ya existe');
    }

    const role = this.rolesRepository.create(createRoleDto);
    return this.rolesRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.find();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  async getUsersByRole(roleId: number) {
    const role = await this.findOne(roleId);
    
    const userRoles = await this.userRolesRepository.find({
      where: { role: { id: roleId } },
      relations: ['user', 'user.people'],
    });

    return userRoles.map(ur => ({
      id: ur.user.id,
      email: ur.user.email,
      nombre: ur.user.people?.name,
      apellido: ur.user.people?.lastName,
      createdAt: ur.user.createdAt
    }));
  }

  async assignRoleToUser(userId: number, roleId: number): Promise<UserRole> {
    const role = await this.findOne(roleId);
    
    const existingUserRole = await this.userRolesRepository.findOne({
      where: { user: { id: userId }, role: { id: roleId } },
    });

    if (existingUserRole) {
      throw new ConflictException('El usuario ya tiene asignado este rol');
    }

    const userRole = this.userRolesRepository.create({
      user: { id: userId },
      role: { id: roleId },
    });

    return this.userRolesRepository.save(userRole);
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    const userRole = await this.userRolesRepository.findOne({
      where: { user: { id: userId }, role: { id: roleId } },
    });

    if (!userRole) {
      throw new NotFoundException('El usuario no tiene asignado este rol');
    }

    await this.userRolesRepository.remove(userRole);
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    const userRoles = await this.userRolesRepository.find({
      where: { user: { id: userId } },
      relations: ['role'],
    });

    return userRoles.map(ur => ur.role);
  }

  async initializeDefaultRoles(): Promise<void> {
    const defaultRoles = [
      {
        name: ROLES.ADMIN,
        description: 'Administrador del sistema',
        permissions: [
          {
            resource: 'users',
            actions: ['create', 'read', 'update', 'delete'],
          },
          {
            resource: 'roles',
            actions: ['create', 'read', 'update', 'delete'],
          },
        ],
      },
      {
        name: ROLES.OPERADOR,
        description: 'Operador del sistema',
        permissions: [
          {
            resource: 'users',
            actions: ['read'],
          },
        ],
      },
    ];

    for (const roleData of defaultRoles) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: roleData.name },
      });

      if (!existingRole) {
        await this.create(roleData);
      }
    }
  }
} 