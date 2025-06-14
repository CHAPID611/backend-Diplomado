import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private userRolesRepository: Repository<UserRole>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new UnauthorizedException('JWT_SECRET no está configurado');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['userRoles', 'userRoles.role']
    });

    if (!user) {
      return null;
    }

    // Obtener los roles del usuario
    const userRoles = await this.userRolesRepository.find({
      where: { user: { id: user.id } },
      relations: ['role']
    });

    const roles = userRoles.map(ur => ur.role.name);

    return {
      id: user.id,
      email: user.email,
      roles: roles
    };
  }
} 