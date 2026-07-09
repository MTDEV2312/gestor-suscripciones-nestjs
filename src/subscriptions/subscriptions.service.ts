import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

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
}
