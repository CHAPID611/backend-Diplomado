import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany, JoinColumn } from 'typeorm';
import { People } from './people.entity';
import { UserRole } from './user-role.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @OneToOne(() => People, people => people.user, { 
    cascade: ['insert', 'update', 'remove'],
    eager: true 
  })
  @JoinColumn()
  people: People;

  @OneToMany(() => UserRole, userRole => userRole.user, { 
    cascade: ['insert', 'update', 'remove'],
    onDelete: 'CASCADE'
  })
  userRoles: UserRole[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 