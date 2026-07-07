import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  name?: string;
  price?: number;
  currency?: string;
  frequency?: 'MONTHLY' | 'YEARLY';
  next_renewal_date?: Date;
  is_active?: boolean;
}
