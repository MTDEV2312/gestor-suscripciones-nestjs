import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '¡API para la Gestión de Suscripciones!';
  }
}
