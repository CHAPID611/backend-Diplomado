import { DataSource } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { ROLES } from '../../modules/roles/constants/roles.constants';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);

  // Crear roles si no existen
  const roles = [
    {
      name: ROLES.ADMIN,
      description: 'Administrador del sistema',
      permissions: [
        {
          resource: 'users',
          actions: ['create', 'read', 'update', 'delete']
        },
        {
          resource: 'roles',
          actions: ['create', 'read', 'update', 'delete']
        }
      ],
    },
    {
      name: ROLES.OPERADOR,
      description: 'Operador del sistema',
      permissions: [
        {
          resource: 'users',
          actions: ['read']
        },
        {
          resource: 'roles',
          actions: ['read']
        }
      ],
    },
  ];

  for (const roleData of roles) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleData.name },
    });

    if (!existingRole) {
      const role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`Rol ${roleData.name} creado`);
    } else {
      console.log(`Rol ${roleData.name} ya existe`);
    }
  }
} 