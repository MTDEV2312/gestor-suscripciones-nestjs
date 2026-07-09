import { PartialType } from '@nestjs/mapped-types';
import { DashboardResponseDto } from './dashboard-response.dto';


export class DashboardQueryDto extends PartialType(DashboardResponseDto) {}
