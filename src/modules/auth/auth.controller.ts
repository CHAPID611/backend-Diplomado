import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Headers, ForbiddenException, Param, Put, Delete } from '@nestjs/common';
import { AuthService, UserResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { ROLES } from '../roles/constants/roles.constants';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  async getProfile(@Request() req) {
    console.log('Token recibido en el controlador:', req.headers.authorization);
    console.log('Usuario en el controlador:', req.user);
    return this.authService.getProfile(req.user.id);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getAllUsers() {
    return this.authService.findAll();
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async getUserProfile(@Param('id') userId: string) {
    return this.authService.findOne(+userId);
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.authService.updateUser(+userId, updateUserDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.ADMIN)
  async deleteUser(@Param('id') userId: string) {
    await this.authService.deleteUser(+userId);
    return { message: 'Usuario eliminado exitosamente' };
  }
} 