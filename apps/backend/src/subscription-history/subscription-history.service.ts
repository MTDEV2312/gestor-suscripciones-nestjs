import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionHistory } from './entities/subscription-history.entity';
import { format } from 'date-fns';

export interface RecordHistoryDto {
  subscription_id: string;
  price: number;
  old_price?: number | null;
  currency: string;
  frequency: 'MONTHLY' | 'YEARLY';
  old_frequency?: 'MONTHLY' | 'YEARLY' | null;
  effective_date?: string;
}

@Injectable()
export class SubscriptionHistoryService {
  constructor(
    @InjectRepository(SubscriptionHistory)
    private readonly historyRepository: Repository<SubscriptionHistory>,
  ) {}

  async recordChange(dto: RecordHistoryDto): Promise<SubscriptionHistory> {
    const history = this.historyRepository.create({
      ...dto,
      effective_date:
        dto.effective_date || format(new Date(), 'yyyy-MM-dd'),
    });
    return await this.historyRepository.save(history);
  }

  async findBySubscription(
    subscriptionId: string,
    userId: string,
  ): Promise<SubscriptionHistory[]> {
    return await this.historyRepository.find({
      where: {
        subscription_id: subscriptionId,
        subscription: {
          user_id: userId,
        },
      },
      order: {
        created_at: 'DESC',
      },
    });
  }
}
