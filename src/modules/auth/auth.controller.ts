import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Headers } from '@nestjs/common';
import { AuthService, UserResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';
import { UserProfileDto } from './dto/user-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<{ user: UserResponse; token: string }> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('authorization') auth: string) {
    const token = auth.split(' ')[1];
    await this.authService.logout(token);
    return { message: 'Sesión cerrada exitosamente' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<UserProfileDto> {
    console.log('Token decodificado:', req.user);
    return this.authService.getProfile(req.user.sub);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getAllUsers() {
    return this.authService.findAll();
  }
} 