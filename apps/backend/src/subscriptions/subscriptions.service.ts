import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { Tag } from 'src/tags/entities/tag.entity';
import { In, Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { SubscriptionHistoryService } from 'src/subscription-history/subscription-history.service';
import { addDays, addMonths, addYears, format } from 'date-fns';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    private readonly userService: UsersService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    req: { user: AuthUser },
  ) {
    const userExists = await this.userService.findById(req.user.id);
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let tags: Tag[] = [];
    if (
      createSubscriptionDto.tagIds &&
      createSubscriptionDto.tagIds.length > 0
    ) {
      tags = await this.tagRepository.find({
        where: { id: In(createSubscriptionDto.tagIds), user_id: req.user.id },
      });
    }

    const { tagIds, ...dtoData } = createSubscriptionDto;
    const subscription = this.subscriptionRepository.create({
      ...dtoData,
      user_id: req.user.id,
      tags,
    });

    const savedSubscription =
      await this.subscriptionRepository.save(subscription);
    return {
      message: 'Suscripción creada exitosamente',
      subscription: savedSubscription,
    };
  }

  async findAll(req: { user: AuthUser }, tagId?: string) {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.tags', 'tag')
      .where('subscription.user_id = :userId', { userId: req.user.id });

    if (tagId) {
      queryBuilder.andWhere('tag.id = :tagId', { tagId });
    }

    return await queryBuilder.getMany();
  }

  async findOne(id: string, req: { user: AuthUser }) {
    return await this.subscriptionRepository.findOne({
      where: { id, user_id: req.user.id },
      relations: { tags: true },
    });
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    req: { user: AuthUser },
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, user_id: req.user.id },
      relations: { tags: true },
    });
    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    const oldPrice = Number(subscription.price);
    const oldFrequency = subscription.frequency;

    const isPriceChanged =
      updateSubscriptionDto.price !== undefined &&
      Number(updateSubscriptionDto.price) !== oldPrice;
    const isFrequencyChanged =
      updateSubscriptionDto.frequency !== undefined &&
      updateSubscriptionDto.frequency !== oldFrequency;

    const { tagIds, ...dtoData } = updateSubscriptionDto;
    Object.assign(subscription, dtoData);

    if (tagIds !== undefined) {
      if (tagIds.length > 0) {
        subscription.tags = await this.tagRepository.find({
          where: { id: In(tagIds), user_id: req.user.id },
        });
      } else {
        subscription.tags = [];
      }
    }

    if (isFrequencyChanged) {
      subscription.next_renewal_date = this.recalculateRenewalDate(
        subscription.start_date,
        subscription.frequency,
      );
    }

    const updatedSubscription =
      await this.subscriptionRepository.save(subscription);

    if (isPriceChanged || isFrequencyChanged) {
      await this.subscriptionHistoryService.recordChange({
        subscription_id: updatedSubscription.id,
        price: Number(updatedSubscription.price),
        old_price: oldPrice,
        frequency: updatedSubscription.frequency,
        old_frequency: oldFrequency,
        currency: updatedSubscription.currency,
        effective_date: format(new Date(), 'yyyy-MM-dd'),
      });
    }

    return updatedSubscription;
  }

  async remove(id: string, req: { user: AuthUser }) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    await this.subscriptionRepository.remove(subscription);
    return {
      message: 'Suscripción eliminada exitosamente',
    };
  }

  async findDueRenewals(): Promise<Subscription[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.is_active = :isActive', { isActive: true })
      .andWhere('SUBSTR(subscription.next_renewal_date, 1, 10) <= :today', {
        today,
      })
      .getMany();
  }

  async findRenewalsInDays(
    days: number,
    baseDate: Date = new Date(),
  ): Promise<Subscription[]> {
    const targetDate = format(addDays(baseDate, days), 'yyyy-MM-dd');
    return await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.is_active = :isActive', { isActive: true })
      .andWhere('SUBSTR(subscription.next_renewal_date, 1, 10) = :targetDate', {
        targetDate,
      })
      .getMany();
  }

  async processDueRenewals(subscription: Subscription) {
    if (!subscription.is_active) {
      return;
    }

    // Calcular la nueva fecha de renovación
    subscription.next_renewal_date =
      this.calculateNextRenewalDate(subscription);

    await this.subscriptionRepository.save(subscription);
  }

  private recalculateRenewalDate(
    startDateStr: string,
    frequency: 'MONTHLY' | 'YEARLY',
  ): string {
    const cleanDate = startDateStr.includes('T')
      ? startDateStr.split('T')[0]
      : startDateStr;
    let date = new Date(`${cleanDate}T00:00:00Z`);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const today = new Date(`${todayStr}T00:00:00Z`);

    if (frequency === 'MONTHLY') {
      date = addMonths(date, 1);
      while (date < today) {
        date = addMonths(date, 1);
      }
    } else if (frequency === 'YEARLY') {
      date = addYears(date, 1);
      while (date < today) {
        date = addYears(date, 1);
      }
    }
    return date.toISOString().split('T')[0];
  }

  private calculateNextRenewalDate(subscription: Subscription): string {
    const cleanDate = subscription.next_renewal_date.includes('T')
      ? subscription.next_renewal_date.split('T')[0]
      : subscription.next_renewal_date;
    const date = new Date(`${cleanDate}T00:00:00Z`);
    let nextDate: Date;
    switch (subscription.frequency) {
      case 'MONTHLY':
        nextDate = addMonths(date, 1);
        break;

      case 'YEARLY':
        nextDate = addYears(date, 1);
        break;

      default:
        throw new Error('Subscription frequency unknown');
    }
    return nextDate.toISOString().split('T')[0];
  }
}

