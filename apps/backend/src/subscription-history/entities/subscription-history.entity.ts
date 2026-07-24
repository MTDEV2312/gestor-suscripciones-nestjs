import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('subscription_history')
export class SubscriptionHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'ID de la suscripción',
  })
  subscription_id!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'precio de la suscripción',
  })
  price!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'precio anterior',
  })
  old_price?: number | null;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: false,
    comment: 'moneda de la suscripción',
  })
  currency!: string;

  @Column({
    type: 'simple-enum',
    enum: ['MONTHLY', 'YEARLY'],
    nullable: false,
    comment: 'frecuencia de la suscripción',
  })
  frequency!: 'MONTHLY' | 'YEARLY';

  @Column({
    type: 'simple-enum',
    enum: ['MONTHLY', 'YEARLY'],
    nullable: true,
    comment: 'frecuencia anterior',
  })
  old_frequency?: 'MONTHLY' | 'YEARLY' | null;

  @Column({
    type: 'date',
    nullable: false,
    comment: 'fecha de efectividad del cambio',
  })
  effective_date!: string;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'fecha de creación del historial',
  })
  created_at!: Date;

  @ManyToOne(() => Subscription, (subscription) => subscription.history, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription;
}
