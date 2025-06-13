export class UserProfileDto {
  id: number;
  email: string;
  nombre?: string;
  apellido?: string;
  roles: string[];
  createdAt: Date;
} 