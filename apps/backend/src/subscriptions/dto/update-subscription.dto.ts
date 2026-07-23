import { PartialType } from '@nestjs/mapped-types';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^(SUBSCRIPTION|DOMAIN|HOSTING)$/, {
    message: 'The type must be SUBSCRIPTION, DOMAIN, or HOSTING.',
  })
  type?: 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING';
}
