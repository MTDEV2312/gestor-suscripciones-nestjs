import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsOptional()
  @IsString()
  subscription_id?: string;

  @IsNotEmpty({ message: 'El nombre de la suscripción es obligatorio' })
  @IsString()
  @Length(1, 100)
  subscription_name!: string;

  @IsNotEmpty({ message: 'El monto es obligatorio' })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @Type(() => Number)
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  amount!: number;

  @IsNotEmpty({ message: 'La moneda es obligatoria' })
  @IsString()
  @Length(3, 3, {
    message: 'La moneda debe ser un código de 3 caracteres (ej. USD)',
  })
  currency!: string;

  @IsNotEmpty({ message: 'La fecha de pago es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de pago debe ser una fecha válida (YYYY-MM-DD)' },
  )
  payment_date!: string;

  @IsNotEmpty({ message: 'El mes de facturación es obligatorio' })
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Type(() => Number)
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  billing_month!: number;

  @IsNotEmpty({ message: 'El año de facturación es obligatorio' })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Type(() => Number)
  @Min(2000, { message: 'El año debe estar entre 2000 y 2100' })
  @Max(2100, { message: 'El año debe estar entre 2000 y 2100' })
  billing_year!: number;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  payment_method?: string;

  @IsOptional()
  @IsIn(['PAID', 'PENDING', 'FAILED'], {
    message: 'El estado debe ser PAID, PENDING o FAILED',
  })
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allow_duplicate?: boolean;
}
