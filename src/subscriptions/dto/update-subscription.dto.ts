import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { IsBoolean } from 'class-validator';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  name?: string;
  price?: number;
  currency?: string;
  frequency?: 'MONTHLY' | 'YEARLY';
  next_renewal_date?: string;
  @IsBoolean()
  is_active?: boolean;
}
