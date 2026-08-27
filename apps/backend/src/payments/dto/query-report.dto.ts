import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class QueryReportDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate debe tener el formato YYYY-MM-DD',
  })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate debe tener el formato YYYY-MM-DD',
  })
  endDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'startMonth debe tener el formato YYYY-MM',
  })
  startMonth?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, {
    message: 'endMonth debe tener el formato YYYY-MM',
  })
  endMonth?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsOptional()
  @IsIn(['PAID', 'PENDING', 'FAILED'], {
    message: 'status debe ser PAID, PENDING o FAILED',
  })
  status?: string;

  @IsOptional()
  @IsString()
  targetCurrency?: string;
}
