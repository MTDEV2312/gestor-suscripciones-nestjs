import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { addMonths, addYears, format } from 'date-fns';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly userService: UsersService,
  ) {}

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    req: { user: AuthUser },
  ) {
    const userExists = await this.userService.findById(req.user.id);
    if (!userExists) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const subscription = this.subscriptionRepository.create({
      ...createSubscriptionDto,
      user_id: req.user.id,
    });

    const savedSubscription =
      await this.subscriptionRepository.save(subscription);
    return {
      message: 'Suscripción creada exitosamente',
      subscription: savedSubscription,
    };
  }

  async findAll(req: { user: AuthUser }) {
    return await this.subscriptionRepository.find({
      where: { user_id: req.user.id },
    });
  }

  async findOne(id: string, req: { user: AuthUser }) {
    return await this.subscriptionRepository.findOne({
      where: { id, user_id: req.user.id },
    });
  }

  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    req: { user: AuthUser },
  ) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    Object.assign(subscription, updateSubscriptionDto);
    return await this.subscriptionRepository.save(subscription);
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
      .andWhere('subscription.next_renewal_date <= :today', { today })
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

  private calculateNextRenewalDate(subscription: Subscription): string {
    const date = new Date(`${subscription.next_renewal_date}T00:00:00Z`);
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
