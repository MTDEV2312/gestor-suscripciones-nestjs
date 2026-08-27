import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionPayment } from './entities/subscription-payment.entity';
import { Subscription } from 'src/subscriptions/entities/subscription.entity';
import { CurrencyService } from 'src/currency/currency.service';
import { AuthUser } from 'src/auth/interfaces/auth-user/auth-user.interface';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryReportDto } from './dto/query-report.dto';

export interface MonthlyBreakdownItem {
  period: string; // YYYY-MM
  year: number;
  month: number;
  total_amount: number;
  transaction_count: number;
}

export interface ExpenseReportResponse {
  total_spent: number;
  target_currency: string;
  paid_count: number;
  subscriptions_count: number;
  currency_breakdown: Record<string, number>;
  monthly_breakdown: MonthlyBreakdownItem[];
  payments: SubscriptionPayment[];
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(SubscriptionPayment)
    private readonly paymentRepository: Repository<SubscriptionPayment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly currencyService: CurrencyService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    req: { user: AuthUser },
  ): Promise<SubscriptionPayment> {
    const billingPeriod = `${createPaymentDto.billing_year}-${String(
      createPaymentDto.billing_month,
    ).padStart(2, '0')}`;

    const status = createPaymentDto.status || 'PAID';

    // Duplicate check for PAID status and subscription_id
    if (
      status === 'PAID' &&
      createPaymentDto.subscription_id &&
      !createPaymentDto.allow_duplicate
    ) {
      const existing = await this.paymentRepository.findOne({
        where: {
          user_id: req.user.id,
          subscription_id: createPaymentDto.subscription_id,
          billing_year: createPaymentDto.billing_year,
          billing_month: createPaymentDto.billing_month,
          status: 'PAID',
        },
      });

      if (existing) {
        throw new ConflictException(
          'Ya existe un pago registrado para este período',
        );
      }
    }

    let subscriptionName = createPaymentDto.subscription_name;
    if (createPaymentDto.subscription_id) {
      const sub = await this.subscriptionRepository.findOne({
        where: { id: createPaymentDto.subscription_id, user_id: req.user.id },
      });
      if (sub && !subscriptionName) {
        subscriptionName = sub.name;
      }
    }

    const { allow_duplicate: _allow_duplicate, ...paymentData } =
      createPaymentDto;

    const payment = this.paymentRepository.create({
      ...paymentData,
      subscription_name: subscriptionName,
      billing_period: billingPeriod,
      status,
      user_id: req.user.id,
    });

    return await this.paymentRepository.save(payment);
  }

  async findAll(
    req: { user: AuthUser },
    query?: QueryReportDto,
  ): Promise<SubscriptionPayment[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.subscription', 'subscription')
      .where('payment.user_id = :userId', { userId: req.user.id });

    if (query?.subscriptionId) {
      queryBuilder.andWhere('payment.subscription_id = :subscriptionId', {
        subscriptionId: query.subscriptionId,
      });
    }

    if (query?.status) {
      queryBuilder.andWhere('payment.status = :status', {
        status: query.status,
      });
    }

    if (query?.startDate) {
      queryBuilder.andWhere('payment.payment_date >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query?.endDate) {
      queryBuilder.andWhere('payment.payment_date <= :endDate', {
        endDate: query.endDate,
      });
    }

    if (query?.startMonth) {
      queryBuilder.andWhere('payment.billing_period >= :startMonth', {
        startMonth: query.startMonth,
      });
    }

    if (query?.endMonth) {
      queryBuilder.andWhere('payment.billing_period <= :endMonth', {
        endMonth: query.endMonth,
      });
    }

    queryBuilder
      .orderBy('payment.payment_date', 'DESC')
      .addOrderBy('payment.created_at', 'DESC');

    return await queryBuilder.getMany();
  }

  async findOne(
    id: string,
    req: { user: AuthUser },
  ): Promise<SubscriptionPayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, user_id: req.user.id },
      relations: { subscription: true },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    return payment;
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto,
    req: { user: AuthUser },
  ): Promise<SubscriptionPayment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, user_id: req.user.id },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    const { allow_duplicate: _allow_duplicate, ...updateData } =
      updatePaymentDto;
    Object.assign(payment, updateData);

    if (
      updatePaymentDto.billing_year !== undefined ||
      updatePaymentDto.billing_month !== undefined
    ) {
      payment.billing_period = `${payment.billing_year}-${String(
        payment.billing_month,
      ).padStart(2, '0')}`;
    }

    return await this.paymentRepository.save(payment);
  }

  async remove(
    id: string,
    req: { user: AuthUser },
  ): Promise<{ message: string }> {
    const payment = await this.paymentRepository.findOne({
      where: { id, user_id: req.user.id },
    });

    if (!payment) {
      throw new NotFoundException('Pago no encontrado');
    }

    await this.paymentRepository.remove(payment);
    return {
      message: 'Pago eliminado exitosamente',
    };
  }

  async getExpenseReport(
    req: { user: AuthUser },
    queryDto: QueryReportDto,
  ): Promise<ExpenseReportResponse> {
    if (
      queryDto.startDate &&
      queryDto.endDate &&
      queryDto.startDate > queryDto.endDate
    ) {
      throw new BadRequestException('startDate no puede ser mayor que endDate');
    }

    if (
      queryDto.startMonth &&
      queryDto.endMonth &&
      queryDto.startMonth > queryDto.endMonth
    ) {
      throw new BadRequestException(
        'startMonth no puede ser mayor que endMonth',
      );
    }

    const targetCurrency = (queryDto.targetCurrency || 'USD').toUpperCase();
    const payments = await this.findAll(req, queryDto);

    let totalSpent = 0;
    let paidCount = 0;
    const uniqueSubs = new Set<string>();
    const currencyBreakdown: Record<string, number> = {};
    const monthlyMap = new Map<string, MonthlyBreakdownItem>();

    for (const payment of payments) {
      const amountNum = Number(payment.amount);
      const curr = payment.currency.toUpperCase();

      // Original currency breakdown (all matching payments)
      currencyBreakdown[curr] = (currencyBreakdown[curr] || 0) + amountNum;

      if (payment.status === 'PAID') {
        paidCount++;
      }

      uniqueSubs.add(payment.subscription_id || payment.subscription_name);

      // Multi-currency conversion to target currency
      const convertedAmount = await this.currencyService.convert(
        amountNum,
        curr,
        targetCurrency,
      );

      totalSpent += convertedAmount;

      // Group by billing period (YYYY-MM)
      const periodKey = payment.billing_period;
      if (!monthlyMap.has(periodKey)) {
        monthlyMap.set(periodKey, {
          period: periodKey,
          year: payment.billing_year,
          month: payment.billing_month,
          total_amount: 0,
          transaction_count: 0,
        });
      }

      const monthItem = monthlyMap.get(periodKey)!;
      monthItem.total_amount += convertedAmount;
      monthItem.transaction_count++;
    }

    // Format currency breakdown
    for (const k of Object.keys(currencyBreakdown)) {
      currencyBreakdown[k] = Number(currencyBreakdown[k].toFixed(2));
    }

    // Format monthly breakdown sorted chronologically
    const monthlyBreakdown = Array.from(monthlyMap.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((item) => ({
        ...item,
        total_amount: Number(item.total_amount.toFixed(2)),
      }));

    return {
      total_spent: Number(totalSpent.toFixed(2)),
      target_currency: targetCurrency,
      paid_count: paidCount,
      subscriptions_count: uniqueSubs.size,
      currency_breakdown: currencyBreakdown,
      monthly_breakdown: monthlyBreakdown,
      payments,
    };
  }

  async exportCsv(
    req: { user: AuthUser },
    queryDto: QueryReportDto,
  ): Promise<string> {
    const report = await this.getExpenseReport(req, queryDto);
    const targetCurrency = report.target_currency;

    const headers = [
      'Fecha de Pago',
      'Suscripción',
      'Período',
      'Mes',
      'Año',
      'Monto Original',
      'Moneda Original',
      'Monto Convertido',
      'Moneda Destino',
      'Estado',
      'Método de Pago',
      'Notas',
    ];

    const sanitizeField = (value: any): string => {
      if (value === null || value === undefined) return '';
      let str = String(value);
      // CSV injection sanitization: prefix formulas with single quote
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      if (
        str.includes(',') ||
        str.includes('"') ||
        str.includes('\n') ||
        str.includes('\r')
      ) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [];
    rows.push(headers.map(sanitizeField).join(','));

    for (const payment of report.payments) {
      const amountNum = Number(payment.amount);
      const converted = await this.currencyService.convert(
        amountNum,
        payment.currency.toUpperCase(),
        targetCurrency,
      );

      const row = [
        payment.payment_date,
        payment.subscription_name,
        payment.billing_period,
        payment.billing_month,
        payment.billing_year,
        amountNum.toFixed(2),
        payment.currency.toUpperCase(),
        converted.toFixed(2),
        targetCurrency,
        payment.status,
        payment.payment_method || '',
        payment.notes || '',
      ];

      rows.push(row.map(sanitizeField).join(','));
    }

    // UTF-8 BOM prefix for Excel compatibility
    return `\uFEFF${rows.join('\r\n')}`;
  }

  async exportPdf(
    req: Request & { user: AuthUser },
    queryDto: QueryReportDto,
  ): Promise<Buffer> {
    const report = await this.getExpenseReport(req, queryDto);
    const targetCurrency = (queryDto.targetCurrency || 'USD').toUpperCase();
    const user = req.user;

    // Convert individual payments for PDF rendering
    const paymentsWithConversion = await Promise.all(
      report.payments.map(async (p) => {
        const amountNum = Number(p.amount);
        const converted = await this.currencyService.convert(
          amountNum,
          p.currency.toUpperCase(),
          targetCurrency,
        );
        return {
          ...p,
          amountNum,
          converted,
        };
      }),
    );

    // PDF Builder Constants
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    const escapePdf = (text: any): string => {
      if (text === null || text === undefined) return '';
      const str = String(text);
      return str
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // normalize accents for standard PDF font compatibility
    };

    // We collect pages. Each page has a stream of PDF drawing commands.
    const pagesContent: string[] = [];
    let currentStream = '';

    const startNewPage = () => {
      if (currentStream) {
        pagesContent.push(currentStream);
      }
      currentStream = '';
    };

    // Draw header on the first page
    currentStream += `
      % --- Header Banner ---
      0.31 0.27 0.90 rg
      ${margin} 796 ${contentWidth} 6 re f
      0 0 0 rg
      BT
      /F2 18 Tf
      0.18 0.22 0.35 rg
      ${margin} 770 Td
      (${escapePdf('GESTOR DE SUSCRIPCIONES')}) Tj
      ET
      BT
      /F1 10 Tf
      0.45 0.50 0.60 rg
      ${margin} 754 Td
      (${escapePdf('Reporte Ejecutivo de Gastos y Pagos')}) Tj
      ET

      % --- Metadata Block (Right aligned box) ---
      0.96 0.97 0.99 rg
      340 740 175 48 re f
      0.85 0.88 0.93 RG
      340 740 175 48 re S
      BT
      /F1 8 Tf
      0.40 0.45 0.55 rg
      348 774 Td
      (${escapePdf(`Usuario: ${user.username || user.email}`)}) Tj
      0 -11 Td
      (${escapePdf(`Emision: ${new Date().toISOString().split('T')[0]}`)}) Tj
      0 -11 Td
      (${escapePdf(`Periodo: ${queryDto.startMonth || queryDto.startDate || 'Inicio'} a ${queryDto.endMonth || queryDto.endDate || 'Actual'}`)}) Tj
      0 -11 Td
      (${escapePdf(`Moneda Destino: ${targetCurrency}`)}) Tj
      ET

      % --- KPI Metric Cards (Y: 670 to 725) ---
      % Card 1: Total Gastado
      0.93 0.95 0.99 rg
      ${margin} 668 160 55 re f
      0.78 0.82 0.99 RG
      ${margin} 668 160 55 re S
      BT
      /F2 8 Tf
      0.31 0.27 0.90 rg
      ${margin + 12} 708 Td
      (${escapePdf('TOTAL GASTADO')}) Tj
      /F2 14 Tf
      0.12 0.15 0.30 rg
      0 -18 Td
      (${escapePdf(`$${report.total_spent.toFixed(2)} ${targetCurrency}`)}) Tj
      /F1 7.5 Tf
      0.45 0.50 0.60 rg
      0 -12 Td
      (${escapePdf(`${report.paid_count} pagos completados`)}) Tj
      ET

      % Card 2: Pagos Realizados
      0.97 0.98 0.99 rg
      ${margin + 175} 668 160 55 re f
      0.88 0.90 0.94 RG
      ${margin + 175} 668 160 55 re S
      BT
      /F2 8 Tf
      0.35 0.40 0.50 rg
      ${margin + 187} 708 Td
      (${escapePdf('PAGOS REALIZADOS')}) Tj
      /F2 14 Tf
      0.12 0.15 0.30 rg
      0 -18 Td
      (${escapePdf(`${report.paid_count} Transacciones`)}) Tj
      /F1 7.5 Tf
      0.45 0.50 0.60 rg
      0 -12 Td
      (${escapePdf(`En el periodo seleccionado`)}) Tj
      ET

      % Card 3: Suscripciones
      0.97 0.98 0.99 rg
      ${margin + 350} 668 165 55 re f
      0.88 0.90 0.94 RG
      ${margin + 350} 668 165 55 re S
      BT
      /F2 8 Tf
      0.35 0.40 0.50 rg
      ${margin + 362} 708 Td
      (${escapePdf('SUSCRIPCIONES')}) Tj
      /F2 14 Tf
      0.12 0.15 0.30 rg
      0 -18 Td
      (${escapePdf(`${report.subscriptions_count} Distintas`)}) Tj
      /F1 7.5 Tf
      0.45 0.50 0.60 rg
      0 -12 Td
      (${escapePdf(`Cobradas en el periodo`)}) Tj
      ET
    `;

    let currentY = 645;

    // Aggregate spending and metadata per subscription
    interface SubAggregate {
      id?: string;
      name: string;
      frequency: string;
      type: string;
      price?: number;
      currency?: string;
      next_renewal_date?: string;
      is_active?: boolean;
      total_original: number;
      total_converted: number;
      count: number;
    }

    const subMap = new Map<string, SubAggregate>();
    for (const p of paymentsWithConversion) {
      const key = p.subscription_id || p.subscription_name;
      if (!subMap.has(key)) {
        const sub = p.subscription;
        subMap.set(key, {
          id: p.subscription_id || undefined,
          name: p.subscription_name,
          frequency: sub?.frequency || 'MONTHLY',
          type: sub?.type || 'SUBSCRIPTION',
          price: sub?.price !== undefined ? Number(sub.price) : undefined,
          currency: sub?.currency || p.currency,
          next_renewal_date: sub?.next_renewal_date,
          is_active: sub?.is_active,
          total_original: 0,
          total_converted: 0,
          count: 0,
        });
      }
      const item = subMap.get(key)!;
      item.total_original += p.amountNum;
      item.total_converted += p.converted;
      item.count++;
    }

    const subscriptionList = Array.from(subMap.values()).sort(
      (a, b) => b.total_converted - a.total_converted,
    );

    // If filtered by a single subscription, render the Highlighted Profile Card
    if (queryDto.subscriptionId && subscriptionList.length > 0) {
      const activeSub = subscriptionList[0];
      const freqLabel = activeSub.frequency === 'YEARLY' ? 'Anual' : 'Mensual';
      const statusText = activeSub.is_active !== false ? 'Activa' : 'Inactiva';
      const statusPillBg =
        activeSub.is_active !== false
          ? '0.90 0.96 0.92 rg'
          : '0.95 0.95 0.95 rg';
      const statusPillText =
        activeSub.is_active !== false
          ? '0.08 0.50 0.25 rg'
          : '0.40 0.40 0.40 rg';

      currentStream += `
        % Profile card container
        0.96 0.97 0.99 rg
        ${margin} ${currentY - 52} ${contentWidth} 52 re f
        0.85 0.88 0.93 RG
        ${margin} ${currentY - 52} ${contentWidth} 52 re S

        % Status badge
        ${statusPillBg}
        ${margin + contentWidth - 65} ${currentY - 18} 55 12 re f

        BT
        /F2 9.5 Tf
        0.18 0.22 0.35 rg
        ${margin + 12} ${currentY - 14} Td
        (${escapePdf(`INFORMACION DE LA SUSCRIPCION: ${activeSub.name.toUpperCase()}`)}) Tj
        ${statusPillText}
        /F2 7 Tf
        ${margin + contentWidth - 55} ${currentY - 12} Td
        (${escapePdf(statusText.toUpperCase())}) Tj
        ET

        BT
        /F1 8 Tf
        0.30 0.35 0.45 rg
        ${margin + 12} ${currentY - 30} Td
        (${escapePdf(`Tipo: ${activeSub.type}`)}) Tj
        ${margin + 120} ${currentY - 30} Td
        (${escapePdf(`Frecuencia: ${freqLabel}`)}) Tj
        ${margin + 230} ${currentY - 30} Td
        (${escapePdf(`Precio Base: $${activeSub.price !== undefined ? activeSub.price.toFixed(2) : activeSub.total_original.toFixed(2)} ${activeSub.currency}`)}) Tj
        ${margin + 360} ${currentY - 30} Td
        (${escapePdf(`Proxima Renovacion: ${activeSub.next_renewal_date || 'N/A'}`)}) Tj
        ET

        BT
        /F2 8 Tf
        0.31 0.27 0.90 rg
        ${margin + 12} ${currentY - 44} Td
        (${escapePdf(`Gasto Acumulado en Periodo: $${activeSub.total_converted.toFixed(2)} ${targetCurrency} (${activeSub.count} pagos registrados)`)}) Tj
        ET
      `;
      currentY -= 64;
    } else if (subscriptionList.length > 0) {
      // Multi-subscription summary table
      currentStream += `
        BT
        /F2 10 Tf
        0.18 0.22 0.35 rg
        ${margin} ${currentY} Td
        (${escapePdf('RESUMEN POR SUSCRIPCION')}) Tj
        ET
      `;
      currentY -= 16;

      // Table Header
      currentStream += `
        0.94 0.95 0.98 rg
        ${margin} ${currentY - 4} ${contentWidth} 16 re f
        0.85 0.88 0.93 RG
        ${margin} ${currentY - 4} ${contentWidth} 16 re S
        BT
        /F2 8 Tf
        0.30 0.35 0.45 rg
        ${margin + 8} ${currentY} Td (${escapePdf('Suscripcion')}) Tj
        ${margin + 175} ${currentY} Td (${escapePdf('Tipo / Frecuencia')}) Tj
        ${margin + 285} ${currentY} Td (${escapePdf('Pagos')}) Tj
        ${margin + 355} ${currentY} Td (${escapePdf(`Total (${targetCurrency})`)}) Tj
        ${margin + 445} ${currentY} Td (${escapePdf('% del Gasto')}) Tj
        ET
      `;
      currentY -= 16;

      for (const s of subscriptionList) {
        if (currentY < 70) {
          startNewPage();
          currentY = 780;
        }
        const freq = s.frequency === 'YEARLY' ? 'Anual' : 'Mensual';
        const percent =
          report.total_spent > 0
            ? ((s.total_converted / report.total_spent) * 100).toFixed(1)
            : '0.0';

        currentStream += `
          0.98 0.98 0.99 rg
          ${margin} ${currentY - 3} ${contentWidth} 14 re f
          BT
          /F1 8 Tf
          0.20 0.25 0.35 rg
          ${margin + 8} ${currentY} Td (${escapePdf(s.name.substring(0, 24))}) Tj
          ${margin + 175} ${currentY} Td (${escapePdf(`${s.type} (${freq})`)}) Tj
          ${margin + 285} ${currentY} Td (${escapePdf(`${s.count}`)}) Tj
          /F2 8 Tf
          ${margin + 355} ${currentY} Td (${escapePdf(`$${s.total_converted.toFixed(2)}`)}) Tj
          /F1 8 Tf
          ${margin + 445} ${currentY} Td (${escapePdf(`${percent}%`)}) Tj
          ET
        `;
        currentY -= 15;
      }
      currentY -= 10;
    }

    // Monthly breakdown section
    if (report.monthly_breakdown.length > 0) {
      if (currentY < 90) {
        startNewPage();
        currentY = 780;
      }

      currentStream += `
        % Monthly section title
        BT
        /F2 10 Tf
        0.18 0.22 0.35 rg
        ${margin} ${currentY} Td
        (${escapePdf('RESUMEN MENSUAL')}) Tj
        ET
      `;
      currentY -= 16;

      // Table Header for Monthly breakdown
      currentStream += `
        0.94 0.95 0.98 rg
        ${margin} ${currentY - 4} ${contentWidth} 16 re f
        0.85 0.88 0.93 RG
        ${margin} ${currentY - 4} ${contentWidth} 16 re S
        BT
        /F2 8 Tf
        0.30 0.35 0.45 rg
        ${margin + 8} ${currentY} Td (${escapePdf('Mes / Periodo')}) Tj
        ${margin + 200} ${currentY} Td (${escapePdf('Suscripciones Pagadas')}) Tj
        ${margin + 400} ${currentY} Td (${escapePdf(`Total (${targetCurrency})`)}) Tj
        ET
      `;
      currentY -= 16;

      for (const m of report.monthly_breakdown) {
        if (currentY < 70) {
          startNewPage();
          currentY = 780;
        }

        currentStream += `
          0.98 0.98 0.99 rg
          ${margin} ${currentY - 3} ${contentWidth} 14 re f
          BT
          /F1 8 Tf
          0.20 0.25 0.35 rg
          ${margin + 8} ${currentY} Td (${escapePdf(m.period)}) Tj
          ${margin + 200} ${currentY} Td (${escapePdf(`${m.transaction_count} pagos`)}) Tj
          /F2 8 Tf
          ${margin + 400} ${currentY} Td (${escapePdf(`$${m.total_amount.toFixed(2)}`)}) Tj
          ET
        `;
        currentY -= 15;
      }
      currentY -= 10;
    }

    // Detailed transactions title
    if (currentY < 90) {
      startNewPage();
      currentY = 780;
    }

    currentStream += `
      BT
      /F2 10 Tf
      0.18 0.22 0.35 rg
      ${margin} ${currentY} Td
      (${escapePdf('DETALLE DE TRANSACCIONES Y PAGOS')}) Tj
      ET
    `;
    currentY -= 16;

    // Helper to render table header
    const renderDetailTableHeader = () => {
      currentStream += `
        0.94 0.95 0.98 rg
        ${margin} ${currentY - 4} ${contentWidth} 16 re f
        0.85 0.88 0.93 RG
        ${margin} ${currentY - 4} ${contentWidth} 16 re S
        BT
        /F2 7.5 Tf
        0.30 0.35 0.45 rg
        ${margin + 6} ${currentY} Td (${escapePdf('Fecha')}) Tj
        ${margin + 65} ${currentY} Td (${escapePdf('Suscripcion')}) Tj
        ${margin + 165} ${currentY} Td (${escapePdf('Periodo')}) Tj
        ${margin + 225} ${currentY} Td (${escapePdf('Metodo')}) Tj
        ${margin + 295} ${currentY} Td (${escapePdf('Monto Orig.')}) Tj
        ${margin + 375} ${currentY} Td (${escapePdf(`Monto (${targetCurrency})`)}) Tj
        ${margin + 455} ${currentY} Td (${escapePdf('Estado')}) Tj
        ET
      `;
      currentY -= 16;
    };

    renderDetailTableHeader();

    if (paymentsWithConversion.length === 0) {
      currentStream += `
        BT
        /F1 9 Tf
        0.50 0.55 0.65 rg
        ${margin + 120} ${currentY - 15} Td
        (${escapePdf('No se encontraron pagos registrados en el periodo seleccionado.')}) Tj
        ET
      `;
      currentY -= 30;
    }

    for (let i = 0; i < paymentsWithConversion.length; i++) {
      const p = paymentsWithConversion[i];

      // If approaching bottom margin, start a new page
      if (currentY < 60) {
        startNewPage();
        currentY = 780;
        currentStream += `
          BT
          /F2 10 Tf
          0.30 0.35 0.45 rg
          ${margin} ${currentY} Td
          (${escapePdf('DETALLE DE TRANSACCIONES (Continuacion)')}) Tj
          ET
        `;
        currentY -= 16;
        renderDetailTableHeader();
      }

      const isEven = i % 2 === 0;
      if (isEven) {
        currentStream += `
          0.98 0.98 0.99 rg
          ${margin} ${currentY - 3} ${contentWidth} 14 re f
        `;
      }

      // Status pill color
      let pillBg = '0.90 0.96 0.92 rg';
      let pillText = '0.08 0.50 0.25 rg';
      let statusLabel = 'PAGADO';
      if (p.status === 'PENDING') {
        pillBg = '0.99 0.95 0.85 rg';
        pillText = '0.65 0.45 0.05 rg';
        statusLabel = 'PENDIENTE';
      } else if (p.status === 'FAILED') {
        pillBg = '0.99 0.90 0.90 rg';
        pillText = '0.75 0.15 0.15 rg';
        statusLabel = 'FALLIDO';
      }

      currentStream += `
        % Status pill background
        ${pillBg}
        ${margin + 450} ${currentY - 2} 55 11 re f
        BT
        /F1 7.5 Tf
        0.20 0.25 0.35 rg
        ${margin + 6} ${currentY} Td (${escapePdf(p.payment_date)}) Tj
        ${margin + 65} ${currentY} Td (${escapePdf(p.subscription_name.substring(0, 18))}) Tj
        ${margin + 165} ${currentY} Td (${escapePdf(p.billing_period)}) Tj
        ${margin + 225} ${currentY} Td (${escapePdf((p.payment_method || 'N/A').substring(0, 12))}) Tj
        ${margin + 295} ${currentY} Td (${escapePdf(`$${p.amountNum.toFixed(2)} ${p.currency}`)}) Tj
        /F2 7.5 Tf
        ${margin + 375} ${currentY} Td (${escapePdf(`$${p.converted.toFixed(2)}`)}) Tj
        ${pillText}
        /F2 6.5 Tf
        ${margin + 456} ${currentY + 1} Td (${escapePdf(statusLabel)}) Tj
        ET
      `;
      currentY -= 14;
    }

    startNewPage();
    const totalPages = pagesContent.length;

    // Render footer on all pages
    const finalPageStreams = pagesContent.map((stream, idx) => {
      const pageNum = idx + 1;
      return `
        ${stream}
        % --- Footer Rule & Page Number ---
        0.88 0.90 0.94 RG
        ${margin} 38 ${contentWidth} 0.5 re S
        BT
        /F1 7.5 Tf
        0.50 0.55 0.65 rg
        ${margin} 26 Td
        (${escapePdf('Gestor de Suscripciones - Reporte Financiero de Pagos')}) Tj
        ${margin + 430} 26 Td
        (${escapePdf(`Pagina ${pageNum} de ${totalPages}`)}) Tj
        ET
      `;
    });

    // Construct raw PDF structure
    const objects: string[] = [];
    let currentObj = 1;

    const catalogObjIndex = currentObj++;
    const pagesObjIndex = currentObj++;
    const font1ObjIndex = currentObj++;
    const font2ObjIndex = currentObj++;

    const pageObjIndices: number[] = [];
    const contentObjIndices: number[] = [];

    for (let i = 0; i < totalPages; i++) {
      pageObjIndices.push(currentObj++);
      contentObjIndices.push(currentObj++);
    }

    // 1: Catalog
    objects[catalogObjIndex] = `<< /Type /Catalog /Pages ${pagesObjIndex} 0 R >>`;

    // 2: Pages
    const kidsStr = pageObjIndices.map((idx) => `${idx} 0 R`).join(' ');
    objects[pagesObjIndex] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${totalPages} >>`;

    // 3: Font Helvetica with standard WinAnsiEncoding
    objects[font1ObjIndex] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;

    // 4: Font Helvetica-Bold with standard WinAnsiEncoding
    objects[font2ObjIndex] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

    // Page and Content objects
    for (let i = 0; i < totalPages; i++) {
      const pageIdx = pageObjIndices[i];
      const contentIdx = contentObjIndices[i];
      const contentStream = finalPageStreams[i].trim();

      objects[pageIdx] = `<< /Type /Page /Parent ${pagesObjIndex} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentIdx} 0 R /Resources << /Font << /F1 ${font1ObjIndex} 0 R /F2 ${font2ObjIndex} 0 R >> /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] >> >>`;
      objects[contentIdx] = `<< /Length ${Buffer.byteLength(contentStream, 'latin1')} >>\nstream\n${contentStream}\nendstream`;
    }

    // Assemble PDF binary data with accurate byte offset calculation
    let pdfData = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
    const xrefOffsets: number[] = [0];

    for (let i = 1; i < currentObj; i++) {
      xrefOffsets[i] = Buffer.byteLength(pdfData, 'latin1');
      pdfData += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const startXref = Buffer.byteLength(pdfData, 'latin1');
    pdfData += `xref\r\n0 ${currentObj}\r\n`;
    pdfData += `0000000000 65535 f \r\n`;

    for (let i = 1; i < currentObj; i++) {
      const offsetStr = String(xrefOffsets[i]).padStart(10, '0');
      pdfData += `${offsetStr} 00000 n \r\n`;
    }

    pdfData += `trailer\r\n<< /Size ${currentObj} /Root ${catalogObjIndex} 0 R >>\r\nstartxref\r\n${startXref}\r\n%%EOF\r\n`;

    return Buffer.from(pdfData, 'latin1');
  }
}

