import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'ID del usuario' })
  id: number;

  @ApiProperty({ description: 'Email del usuario' })
  email: string;

  @ApiProperty({ description: 'Nombre de la persona' })
  name: string;

  @ApiProperty({ description: 'Apellido de la persona' })
  lastName: string;

  @ApiProperty({ description: 'Roles del usuario', type: [String] })
  roles: string[];

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;
} 