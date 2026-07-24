import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { addMonths, startOfMonth, format } from 'date-fns';
import { CurrencyService } from 'src/currency/currency.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly userService: UsersService,
    private readonly currencyService: CurrencyService,
  ) {}

  async getRevenueSummarySpending(
    req: { user: AuthUser },
    targetCurrency: string = 'USD',
  ): Promise<{ monthlySpending: number; yearlySpending: number }> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { user_id: req.user.id, is_active: true },
    });

    let monthlySpending = 0;
    let yearlySpending = 0;

    for (const sub of subscriptions) {
      const convertedPrice = await this.currencyService.convert(
        Number(sub.price),
        sub.currency || 'USD',
        targetCurrency,
      );
      if (sub.frequency === 'MONTHLY') {
        monthlySpending += convertedPrice;
      } else if (sub.frequency === 'YEARLY') {
        yearlySpending += convertedPrice;
      }
    }

    return {
      monthlySpending: Number(monthlySpending.toFixed(2)),
      yearlySpending: Number(yearlySpending.toFixed(2)),
    };
  }

  async getNextMonthRenewals(req: {
    user: AuthUser;
  }): Promise<{ name: string; date: string }[]> {
    const now = new Date();
    const startofMonth = format(startOfMonth(now), 'yyyy-MM-dd');
    const startOfNextMonth = format(
      addMonths(startOfMonth(now), 1),
      'yyyy-MM-dd',
    );

    const nextRenewals = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.user_Id = :user_Id', { user_Id: req.user.id })
      .andWhere('subscription.is_active = :is_active', { is_active: true })
      .andWhere('subscription.next_renewal_date >= :startofMonth', {
        startofMonth,
      })
      .andWhere('subscription.next_renewal_date < :startOfNextMonth', {
        startOfNextMonth,
      })
      .orderBy('subscription.next_renewal_date', 'ASC')
      .getMany();

    return nextRenewals.map((subscription) => ({
      name: subscription.name,
      date: subscription.next_renewal_date,
    }));
  }

  async dashboard(
    req: { user: AuthUser },
    targetCurrency: string = 'USD',
  ): Promise<{
    monthlySpending: number;
    yearlySpending: number;
    nextRenewal: { name: string; date: string }[];
  }> {
    const userExists = await this.userService.findById(req.user.id);
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { monthlySpending, yearlySpending } =
      await this.getRevenueSummarySpending(req, targetCurrency);
    const nextRenewals = await this.getNextMonthRenewals(req);

    return {
      monthlySpending,
      yearlySpending,
      nextRenewal: nextRenewals,
    };
  }
}
