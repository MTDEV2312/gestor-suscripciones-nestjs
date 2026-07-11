import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { UsersService } from 'src/users/users.service';
import { Repository } from 'typeorm';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly userService: UsersService,
  ) {}

  async getRevenueSummarySpending(req: {
    user: AuthUser;
  }): Promise<{ monthlySpending: number; yearlySpending: number }> {
    type RevenueSummary = {
      frequency: 'MONTHLY' | 'YEARLY';
      total: number;
    };
    const result = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.frequency', 'frequency')
      .addSelect('SUM(subscription.price)', 'total')
      .where('subscription.user_Id = :user_Id', { user_Id: req.user.id })
      .andWhere('subscription.is_active = :is_active', { is_active: true })
      .groupBy('subscription.frequency')
      .getRawMany<RevenueSummary>();

    const monthlySpending = Number(
      Number(result.find((r) => r.frequency === 'MONTHLY')?.total ?? 0).toFixed(
        2,
      ),
    );
    const yearlySpending = Number(
      Number(result.find((r) => r.frequency === 'YEARLY')?.total ?? 0).toFixed(
        2,
      ),
    );

    return { monthlySpending, yearlySpending };
  }

  async getNextMonthRenewals(req: {
    user: AuthUser;
  }): Promise<{ name: string; date: Date }[]> {
    const now = new Date();
    const startofMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

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

  async dashboard(req: { user: AuthUser }): Promise<{
    monthlySpending: number;
    yearlySpending: number;
    nextRenewal: { name: string; date: Date }[];
  }> {
    const userExists = await this.userService.findById(req.user.id);
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { monthlySpending, yearlySpending } =
      await this.getRevenueSummarySpending(req);
    const nextRenewals = await this.getNextMonthRenewals(req);

    return {
      monthlySpending: monthlySpending,
      yearlySpending: yearlySpending,
      nextRenewal: nextRenewals,
    };
  }
}
