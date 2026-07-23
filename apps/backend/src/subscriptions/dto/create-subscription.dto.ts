import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {
  toLowerCaseTransform,
  trimTransform,
} from 'src/common/transformers/transformer';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Transform(trimTransform)
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  price!: number;

  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  @Transform(trimTransform)
  @Transform(toLowerCaseTransform)
  currency!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(trimTransform)
  @Matches(/^(MONTHLY|YEARLY)$/, {
    message: 'The frequency must be MONTHLY or YEARLY.',
  })
  frequency!: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  @Matches(/^(SUBSCRIPTION|DOMAIN|HOSTING)$/, {
    message: 'The type must be SUBSCRIPTION, DOMAIN, or HOSTING.',
  })
  type?: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING';

  @IsNotEmpty()
  @IsDateString(
    {},
    {
      message: 'The start date must be a valid date',
    },
  )
  start_date!: string;

  @IsNotEmpty()
  @IsDateString(
    {},
    {
      message: 'The next renewal date must be a valid date',
    },
  )
  next_renewal_date!: string;
}
