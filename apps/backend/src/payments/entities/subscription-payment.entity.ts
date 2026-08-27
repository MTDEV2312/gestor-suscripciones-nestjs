import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('subscription_payments')
@Index('IDX_payments_user_date', ['user_id', 'payment_date'])
@Index('IDX_payments_user_period', ['user_id', 'billing_year', 'billing_month'])
@Index('IDX_payments_sub_period', ['subscription_id', 'billing_period'])
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'ID del usuario propietario del pago',
  })
  user_id!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'ID de la suscripción vinculada',
  })
  subscription_id?: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Instantánea del nombre de la suscripción al momento del pago',
  })
  subscription_name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    comment: 'Monto pagado',
  })
  amount!: number;

  @Column({
    type: 'varchar',
    length: 3,
    nullable: false,
    comment: 'Moneda del pago',
  })
  currency!: string;

  @Column({
    type: 'date',
    nullable: false,
    comment: 'Fecha en que se realizó el pago',
  })
  payment_date!: string;

  @Column({
    type: 'smallint',
    nullable: false,
    comment: 'Mes del período de facturación (1-12)',
  })
  billing_month!: number;

  @Column({
    type: 'smallint',
    nullable: false,
    comment: 'Año del período de facturación',
  })
  billing_year!: number;

  @Column({
    type: 'varchar',
    length: 7,
    nullable: false,
    comment: 'Período en formato YYYY-MM',
  })
  billing_period!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Método de pago utilizado',
  })
  payment_method?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'PAID',
    comment: 'Estado del pago (PAID, PENDING, FAILED)',
  })
  status!: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notas o comentarios adicionales del pago',
  })
  notes?: string | null;

  @CreateDateColumn({
    type: 'datetime',
    comment: 'Fecha de creación del registro',
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'datetime',
    comment: 'Fecha de última actualización del registro',
  })
  updated_at!: Date;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Subscription, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Subscription | null;
}
