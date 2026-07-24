import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exchange_rate_fallback')
export class ExchangeRateFallback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
    comment: 'Moneda base (ej. USD)',
  })
  base_currency!: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: false,
    comment: 'Moneda destino (ej. EUR)',
  })
  target_currency!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 6,
    nullable: false,
    comment: 'Tasa de cambio manual de respaldo',
  })
  rate!: number;

  @UpdateDateColumn({
    type: 'datetime',
    comment: 'Fecha de última actualización',
  })
  updated_at!: Date;
}
