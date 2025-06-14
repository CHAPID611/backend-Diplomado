import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { UserRole } from './entities/user-role.entity';
import { People } from './entities/people.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { BlacklistedToken } from './entities/blacklisted-token.entity';
import { LogsService } from '../logs/logs.service';
import { TipoActividad } from '../logs/entities/log-actividad.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { ROLES } from '../roles/constants/roles.constants';

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  lastName: string;
  roles: string[];
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRolesRepository: Repository<UserRole>,
    @InjectRepository(People)
    private readonly peopleRepository: Repository<People>,
    @InjectRepository(BlacklistedToken)
    private readonly blacklistedTokenRepository: Repository<BlacklistedToken>,
    private readonly jwtService: JwtService,
    private readonly logsService: LogsService,
  ) {}

  async findAll() {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.people', 'people')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .getMany();

    return users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.people?.name || '',
      lastName: user.people?.lastName || '',
      roles: user.userRoles?.map(ur => ur.role.name) || [],
      createdAt: user.createdAt
    }));
  }

  async register(registerDto: RegisterDto): Promise<{ user: UserResponse; token: string }> {
    const { email, password, name, lastName, roleIds } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.userRepository.findOne({
      where: { email },
      relations: ['people'],
    });

    if (existingUser) {
      throw new ConflictException('El usuario ya existe');
    }

    // Crear el usuario
    const user = this.userRepository.create({
      email,
      password: await bcrypt.hash(password, 10),
      people: {
        name,
        lastName,
      },
    });

    // Asignar roles
    if (roleIds && roleIds.length > 0) {
      // Verificar que los roles existan
      const roles = await this.rolesRepository.findByIds(roleIds);
      if (roles.length !== roleIds.length) {
        throw new NotFoundException('Uno o más roles no existen');
      }
      user.userRoles = roles.map(role => this.userRolesRepository.create({ role }));
    } else {
      // Asignar rol de operador por defecto
      const defaultRole = await this.rolesRepository.findOne({
        where: { name: ROLES.OPERADOR }
      });
      if (!defaultRole) {
        throw new NotFoundException('No se encontró el rol por defecto');
      }
      user.userRoles = [this.userRolesRepository.create({ role: defaultRole })];
    }

    // Guardar el usuario
    const savedUser = await this.userRepository.save(user);

    // Generar token
    const token = this.jwtService.sign({
      sub: savedUser.id,
      email: savedUser.email,
      roles: savedUser.userRoles.map(ur => ur.role.name),
    });

    // Registrar la actividad
    await this.logsService.registrarActividad(
      TipoActividad.CREACION,
      'Usuario registrado',
      savedUser,
      'User',
      savedUser.id
    );

    // Obtener el usuario completo con sus relaciones
    const completeUser = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['people', 'userRoles', 'userRoles.role']
    });

    if (!completeUser) {
      throw new InternalServerErrorException('Error al recuperar el usuario registrado');
    }

    return {
      user: {
        id: completeUser.id,
        email: completeUser.email,
        name: completeUser.people?.name || '',
        lastName: completeUser.people?.lastName || '',
        roles: completeUser.userRoles?.map(ur => ur.role.name) || [],
        createdAt: completeUser.createdAt
      },
      token
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: UserResponse; token: string }> {
    const { email, password } = loginDto;

    // Buscar el usuario con sus roles y datos personales
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.people', 'people')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Obtener los roles del usuario
    const userRoles = await this.userRolesRepository.find({
      where: { user: { id: user.id } },
      relations: ['role'],
    });

    const roles = userRoles.map(ur => ur.role.name);

    // Generar el token JWT
    const token = this.jwtService.sign({ 
      sub: user.id,
      email: user.email,
      roles: roles
    });

    // Registrar la actividad
    await this.logsService.registrarActividad(
      TipoActividad.ACTUALIZACION,
      `Usuario inició sesión: ${user.email}`,
      user,
      'User',
      user.id
    );

    // Retornar solo los datos necesarios
    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.people?.name || '',
      lastName: user.people?.lastName || '',
      roles: roles,
      createdAt: user.createdAt
    };

    return { user: userResponse, token };
  }

  async logout(token: string): Promise<void> {
    try {
      // Verificar que el token sea válido
      const decoded = this.jwtService.verify(token);
      
      // Guardar el token en la lista negra
      const blacklistedToken = this.blacklistedTokenRepository.create({
        token
      });
      
      await this.blacklistedTokenRepository.save(blacklistedToken);

      // Registrar la actividad
      const user = await this.userRepository.findOne({ where: { id: decoded.sub } });
      if (user) {
        await this.logsService.registrarActividad(
          TipoActividad.ACTUALIZACION,
          `Usuario cerró sesión: ${user.email}`,
          user,
          'User',
          user.id
        );
      }
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.blacklistedTokenRepository.findOne({
      where: { token }
    });
    return !!blacklistedToken;
  }

  async getProfile(userId: number): Promise<UserProfileDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['people', 'userRoles', 'userRoles.role']
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.people?.name || '',
      lastName: user.people?.lastName || '',
      roles: user.userRoles?.map(ur => ur.role.name) || [],
      createdAt: user.createdAt
    };
  }

  async findOne(id: number): Promise<UserResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['people', 'userRoles', 'userRoles.role']
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.people?.name || '',
      lastName: user.people?.lastName || '',
      roles: user.userRoles?.map(ur => ur.role.name) || [],
      createdAt: user.createdAt
    };
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    // Iniciar una transacción
    return await this.userRepository.manager.transaction(async transactionalEntityManager => {
      console.log('Iniciando actualización de usuario:', { id, updateUserDto });

      // Primero, eliminar todos los roles existentes del usuario
      await transactionalEntityManager
        .createQueryBuilder()
        .delete()
        .from(UserRole)
        .where('user.id = :userId', { userId: id })
        .execute();

      // Obtener el usuario
      const user = await transactionalEntityManager.findOne(User, {
        where: { id },
        relations: ['people']
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      console.log('Usuario encontrado:', {
        id: user.id,
        email: user.email
      });

      // Actualizar datos del usuario
      if (updateUserDto.email) {
        user.email = updateUserDto.email;
      }

      if (updateUserDto.password) {
        user.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      // Actualizar datos personales
      if (updateUserDto.name || updateUserDto.lastName) {
        if (!user.people) {
          user.people = new People();
        }
        if (updateUserDto.name) {
          user.people.name = updateUserDto.name;
        }
        if (updateUserDto.lastName) {
          user.people.lastName = updateUserDto.lastName;
        }
      }

      // Actualizar roles
      if (updateUserDto.roleIds && updateUserDto.roleIds.length > 0) {
        console.log('Actualizando roles:', { roleIds: updateUserDto.roleIds });

        // Verificar que los roles existan
        const roles = await transactionalEntityManager.find(Role, {
          where: { id: In(updateUserDto.roleIds) }
        });

        if (roles.length !== updateUserDto.roleIds.length) {
          throw new NotFoundException('Uno o más roles no existen');
        }

        // Asignar nuevos roles
        const newUserRoles = roles.map(role => {
          const userRole = new UserRole();
          userRole.user = { id: user.id } as User;
          userRole.role = role;
          return userRole;
        });

        console.log('Guardando nuevos roles:', newUserRoles);
        await transactionalEntityManager.save(UserRole, newUserRoles);
      }

      // Registrar la actividad antes de guardar
      await this.logsService.registrarActividad(
        TipoActividad.ACTUALIZACION,
        `Usuario actualizado: ${user.email}`,
        user,
        'User',
        user.id
      );

      // Guardar el usuario actualizado
      await transactionalEntityManager.save(User, user);

      // Verificar los roles directamente en la base de datos
      const userRoles = await transactionalEntityManager
        .createQueryBuilder(UserRole, 'userRole')
        .leftJoinAndSelect('userRole.role', 'role')
        .where('userRole.user.id = :userId', { userId: id })
        .getMany();

      console.log('Roles verificados en la base de datos:', userRoles.map(ur => ur.role.name));

      // Obtener el usuario actualizado con todas sus relaciones
      const updatedUser = await transactionalEntityManager
        .createQueryBuilder(User, 'user')
        .leftJoinAndSelect('user.people', 'people')
        .where('user.id = :id', { id })
        .getOne();

      if (!updatedUser) {
        throw new InternalServerErrorException('Error al recuperar el usuario actualizado');
      }

      // Transformar la respuesta para incluir los roles
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.people?.name || '',
        lastName: updatedUser.people?.lastName || '',
        roles: userRoles.map(ur => ur.role.name),
        createdAt: updatedUser.createdAt
      };
    });
  }

  async deleteUser(id: number): Promise<void> {
    // Buscar el usuario con sus relaciones
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['people', 'userRoles']
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Registrar la actividad antes de eliminar
    await this.logsService.registrarActividad(
      TipoActividad.ELIMINACION,
      `Usuario eliminado: ${user.email}`,
      user,
      'User',
      user.id
    );

    // Guardar referencia a la persona antes de eliminar el usuario
    const peopleToDelete = user.people;

    // Eliminar el usuario (esto eliminará también los roles por la cascada)
    await this.userRepository.remove(user);

    // Eliminar la persona asociada después de eliminar el usuario
    if (peopleToDelete) {
      await this.peopleRepository.remove(peopleToDelete);
    }
  }
}