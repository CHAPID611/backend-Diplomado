import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException } from '@nestjs/common';
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

export interface UserResponse {
  id: number;
  email: string;
  nombre?: string;
  apellido?: string;
  roles: string[];
  createdAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(UserRole)
    private userRolesRepository: Repository<UserRole>,
    @InjectRepository(People)
    private peopleRepository: Repository<People>,
    @InjectRepository(BlacklistedToken)
    private blacklistedTokenRepository: Repository<BlacklistedToken>,
    private jwtService: JwtService,
    private logsService: LogsService,
  ) {}

  async findAll() {
    const users = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.people', 'people')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .getMany();

    return users.map(user => ({
      id: user.id,
      email: user.email,
      nombre: user.people?.nombre,
      apellido: user.people?.apellido,
      roles: user.userRoles.map(ur => ur.role.name),
      createdAt: user.createdAt
    }));
  }

  async register(registerDto: RegisterDto): Promise<{ user: User; token: string }> {
    const { email, password, nombre, apellido, roleIds } = registerDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el nuevo usuario
    const user = this.usersRepository.create({
      email,
      password: hashedPassword
    });

    // Guardar el usuario primero para obtener su ID
    const savedUser = await this.usersRepository.save(user);

    // Crear los datos personales
    const people = this.peopleRepository.create({
      nombre,
      apellido,
      user: savedUser
    });

    // Guardar los datos personales
    await this.peopleRepository.save(people);

    // Asignar roles si se proporcionaron
    if (roleIds && roleIds.length > 0) {
      console.log('Asignando roles:', roleIds);
      const roles = await this.rolesRepository.findBy({ id: In(roleIds) });
      console.log('Roles encontrados:', roles);

      if (roles.length > 0) {
        const userRoles = roles.map(role => 
          this.userRolesRepository.create({
            user: savedUser,
            role: role
          })
        );
        await this.userRolesRepository.save(userRoles);
        console.log('Roles asignados exitosamente');
      }
    }

    // Generar el token JWT
    const token = this.jwtService.sign({ 
      sub: savedUser.id,
      email: savedUser.email,
    });

    // Registrar la actividad
    await this.logsService.registrarActividad(
      TipoActividad.CREACION,
      'Usuario registrado',
      savedUser,
      'User',
      savedUser.id,
      { email, nombre, apellido }
    );

    return { user: savedUser, token };
  }

  async login(loginDto: LoginDto): Promise<{ user: UserResponse; token: string }> {
    try {
      const { email, password } = loginDto;

      // Buscar el usuario con sus roles y datos personales
      const user = await this.usersRepository
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

      console.log('Generando token para usuario:', {
        id: user.id,
        email: user.email,
        roles: roles
      });

      // Generar el token JWT
      const token = this.jwtService.sign({ 
        sub: user.id,
        email: user.email,
        roles: roles
      });

      // Verificar el token generado
      const decodedToken = this.jwtService.verify(token);
      console.log('Token generado y decodificado:', decodedToken);

      // Registrar la actividad
      await this.logsService.registrarActividad(
        TipoActividad.LOGIN,
        'Inicio de sesión',
        user,
        'User',
        user.id
      );

      // Retornar solo los datos necesarios
      const userResponse: UserResponse = {
        id: user.id,
        email: user.email,
        nombre: user.people?.nombre,
        apellido: user.people?.apellido,
        roles: roles,
        createdAt: user.createdAt
      };

      return { user: userResponse, token };
    } catch (error) {
      console.error('Error en login:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new InternalServerErrorException(`Error en el login: ${error.message}`);
    }
  }

  async getProfile(userId: number): Promise<UserProfileDto> {
    console.log('Buscando perfil para userId:', userId);
    
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.people', 'people')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.id = :userId', { userId })
      .getOne();

    console.log('Usuario encontrado:', user);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      nombre: user.people?.nombre,
      apellido: user.people?.apellido,
      roles: user.userRoles?.map(ur => ur.role.name) || [],
      createdAt: user.createdAt
    };
  }

  async logout(token: string): Promise<void> {
    try {
      // Verificar que el token sea válido
      const decoded = this.jwtService.verify(token);
      
      // Obtener el usuario
      const user = await this.usersRepository.findOne({
        where: { id: decoded.sub }
      });

      if (user) {
        // Registrar la actividad
        await this.logsService.registrarActividad(
          TipoActividad.LOGOUT,
          'Cierre de sesión',
          user,
          'User',
          user.id
        );
      }

      // Guardar el token en la lista negra
      const blacklistedToken = this.blacklistedTokenRepository.create({
        token
      });
      
      await this.blacklistedTokenRepository.save(blacklistedToken);
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
} 