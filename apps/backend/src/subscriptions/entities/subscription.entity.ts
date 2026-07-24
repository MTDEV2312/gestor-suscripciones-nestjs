import { SubscriptionHistory } from 'src/subscription-history/entities/subscription-history.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'nombre de la suscripcion',
  })
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'precio de la suscripcion',
  })
  price!: number;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: false,
    comment: 'moneda de la suscripcion',
  })
  currency!: string;

  @Column({
    type: 'simple-enum',
    enum: ['MONTHLY', 'YEARLY'],
    nullable: false,
    comment: 'frecuencia de la suscripcion',
  })
  frequency!: 'MONTHLY' | 'YEARLY';

  @Column({
    type: 'date',
    nullable: false,
    comment: 'fecha de inicio de la suscripcion',
  })
  start_date!: string;

  @Column({
    type: 'date',
    nullable: false,
    comment: 'fecha de renovacion de la suscripcion',
  })
  next_renewal_date!: string;

  @Column({
    type: 'boolean',
    nullable: false,
    comment: 'estado de la suscripcion',
    default: true,
  })
  is_active!: boolean;

  @Column({
    type: 'simple-enum',
    enum: ['SUBSCRIPTION', 'DOMAIN', 'HOSTING'],
    nullable: false,
    default: 'SUBSCRIPTION',
    comment: 'tipo de la suscripcion',
  })
  type!: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING';

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'usuario al que pertenece la suscripcion',
  })
  user_id!: string;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de creacion de la suscripcion',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'datetime',
    comment: 'fecha de actualizacion de la suscripcion',
  })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.subscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => SubscriptionHistory, (history) => history.subscription)
  history!: SubscriptionHistory[];

  @ManyToMany(() => Tag, (tag) => tag.subscriptions, {
    cascade: true,
  })
  @JoinTable({
    name: 'subscription_tags',
    joinColumn: { name: 'subscription_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags!: Tag[];
}

