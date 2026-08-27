import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.create(createPaymentDto, req);
  }

  @Get('report/export/csv')
  async exportCsv(
    @Query() queryDto: QueryReportDto,
    @Request() req: Request & { user: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const csvContent = await this.paymentsService.exportCsv(req, queryDto);
    const filename = queryDto.startMonth
      ? `reporte-pagos-${queryDto.startMonth}.csv`
      : 'reporte-pagos.csv';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csvContent;
  }

  @Get('report/export/pdf')
  async exportPdf(
    @Query() queryDto: QueryReportDto,
    @Request() req: Request & { user: AuthUser },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.paymentsService.exportPdf(req, queryDto);
    const filename = queryDto.startMonth
      ? `reporte-gastos-${queryDto.startMonth}.pdf`
      : 'reporte-gastos.pdf';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    return new StreamableFile(pdfBuffer);
  }

  @Get('report')
  @HttpCode(HttpStatus.OK)
  getExpenseReport(
    @Query() queryDto: QueryReportDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.getExpenseReport(req, queryDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll(
    @Query() queryDto: QueryReportDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.findAll(req, queryDto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.findOne(id, req);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.update(id, updatePaymentDto, req);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id') id: string,
    @Request() req: Request & { user: AuthUser },
  ) {
    return this.paymentsService.remove(id, req);
  }
}
