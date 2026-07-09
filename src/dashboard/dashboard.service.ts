import { Injectable } from '@nestjs/common';


@Injectable()
export class DashboardService {

  dashboard() {
    return `This action returns all information Dashboard`;
  }

}
