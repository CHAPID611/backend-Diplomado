import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '../../roles/constants/roles.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('Request headers:', request.headers);
    console.log('Usuario en el guard:', user);
    console.log('Roles requeridos:', requiredRoles);
    
    if (!user) {
      console.log('No hay usuario en la request');
      return false;
    }

    if (!user.roles) {
      console.log('El usuario no tiene roles asignados');
      return false;
    }

    const hasRole = requiredRoles.some(role => user.roles.includes(role));
    console.log('¿Tiene el rol requerido?:', hasRole);
    
    return hasRole;
  }
} 