# Technical Design: Fix Missing Data & Multi-Column Layout in PDF Report

## 1. Overview & Root Cause Analysis
The relative PDF operator `Td` caused all columns following the first column ("Fecha") to multiply their vertical translation by `currentY` (~600pt), positioning them at `Y = 1200+`, well outside the A4 canvas height (841.89 pt).

## 2. Technical Solution: Absolute Text Matrix Positioning
Introduce a robust helper `textAt(x, y, font, size, rgb, text)` using `1 0 0 1 x y Tm`:

```typescript
const textAt = (
  x: number,
  y: number,
  font: string,
  size: number,
  rgb: string,
  text: any,
): string => {
  if (text === null || text === undefined || text === '') return '';
  const escaped = escapePdf(text);
  return `BT ${rgb} /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escaped}) Tj ET\n`;
};
```

## 3. Printable Geometry on A4 (Width: 595.28, Margin: 40, Content Width: 515.28 pt)

### 3.1 Transaction Ledger Table Layout
- **Fecha** (`x = margin + 6`, width: ~55 pt)
- **Suscripción** (`x = margin + 65`, width: ~105 pt)
- **Período** (`x = margin + 172`, width: ~50 pt)
- **Método** (`x = margin + 225`, width: ~70 pt)
- **Monto Orig.** (`x = margin + 300`, width: ~75 pt)
- **Monto Target** (`x = margin + 380`, width: ~65 pt)
- **Estado Badge** (`x = margin + 450`, width: ~60 pt)

### 3.2 Subscription Summary Table Layout
- **Suscripción** (`x = margin + 8`, width: ~165 pt)
- **Tipo / Frecuencia** (`x = margin + 175`, width: ~105 pt)
- **Pagos** (`x = margin + 285`, width: ~65 pt)
- **Total Converted** (`x = margin + 355`, width: ~85 pt)
- **% del Gasto** (`x = margin + 445`, width: ~65 pt)

### 3.3 Monthly Summary Table Layout
- **Mes / Período** (`x = margin + 8`, width: ~190 pt)
- **Suscripciones Pagadas** (`x = margin + 200`, width: ~190 pt)
- **Total Converted** (`x = margin + 400`, width: ~110 pt)
