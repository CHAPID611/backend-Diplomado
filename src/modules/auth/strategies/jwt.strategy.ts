import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserRole)
    private userRolesRepository: Repository<UserRole>,
    private authService: AuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any) {
    console.log('Payload del token:', payload);
    
    // Obtener el token del header
    const token = request.headers.authorization?.split(' ')[1];
    
    // Verificar si el token está en la lista negra
    if (token && await this.authService.isTokenBlacklisted(token)) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.usersRepository.findOne({
      where: { id: payload.sub },
      relations: ['people', 'userRoles', 'userRoles.role'],
    });

    console.log('Usuario encontrado:', user);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Obtener los roles del usuario
    const userRoles = await this.userRolesRepository.find({
      where: { user: { id: user.id } },
      relations: ['role'],
    });

    const roles = userRoles.map(ur => ur.role.name);

    return {
      id: user.id,
      email: user.email,
      roles: roles
    };
  }
} 