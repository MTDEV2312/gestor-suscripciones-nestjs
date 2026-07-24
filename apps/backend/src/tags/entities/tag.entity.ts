import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'nombre de la etiqueta',
  })
  name!: string;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: false,
    default: '#6B7280',
    comment: 'color en hex de la etiqueta',
  })
  color!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'usuario al que pertenece la etiqueta',
  })
  user_id!: string;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de creacion de la etiqueta',
  })
  created_at!: Date;

  @ManyToOne(() => User, (user) => user.tags, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToMany(() => Subscription, (subscription) => subscription.tags)
  subscriptions!: Subscription[];
}
