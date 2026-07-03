import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
    comment: 'nombre del usuario',
  })
  username: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: false,
    comment: 'correo electronico del usuario',
  })
  email: string;

  @Column({
    type: 'varchar',
    nullable: false,
    comment: 'contraseña del usuario',
  })
  password: string;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de registro del usuario',
  })
  createdAt: Date;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de actualizacion del usuario',
  })
  updatedAt: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Subscription[];
}
