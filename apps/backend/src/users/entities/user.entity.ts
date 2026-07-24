import { Exclude } from 'class-transformer';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { Tag } from 'src/tags/entities/tag.entity';
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
  id!: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    nullable: false,
    comment: 'nombre del usuario',
  })
  username!: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: false,
    comment: 'correo electronico del usuario',
  })
  email!: string;

  @Column({
    type: 'varchar',
    nullable: false,
    comment: 'contraseña del usuario',
  })
  @Exclude()
  password!: string;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de registro del usuario',
  })
  createdAt!: Date;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de actualizacion del usuario',
  })
  updatedAt!: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'nombre de usuario de Telegram para CallMeBot',
  })
  telegramUsername?: string;

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions!: Subscription[];

  @OneToMany(() => Tag, (tag) => tag.user)
  tags!: Tag[];
}
