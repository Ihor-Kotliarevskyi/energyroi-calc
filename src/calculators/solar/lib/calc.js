// ─── Default parameters ────────────────────────────────────────────────────

export const DEF = {
  // Режим калькулятора
  calcType: 'solar', // 'solar' | 'bess' | 'solar_bess'

  projectName: 'Мій проєкт',

  // ── СЕС-параметри ──────────────────────────────────────────────────────────
  pvMW: 1.0,
  specificYield: 1100,       // кВт·год/кВт·рік (середнє по Україні)
  degradation: 0.7,          // %/рік
  selfUseShare: 0.6,         // частка власного споживання (0–1)
  gridPrice: 7.2,            // грн/кВт·год — ціна заміщення з мережі
  feedInTariff: 4.2,         // грн/кВт·год — тариф продажу / зелений тариф
  pvCapex: 28000000,         // грн (CAPEX СЕС)
  pvOpex: 1.5,               // % від CAPEX/рік

  // ── УЗЕ-параметри ──────────────────────────────────────────────────────────
  bessCapacityMWh: 1.0,      // МВт·год
  roundTripEff: 0.90,        // ККД циклу (заряд→розряд)
  bessDegrad: 2.0,           // деградація батарей, %/рік
  cyclesPerYear: 250,        // кількість повних циклів на рік
  peakTariff: 16.0,          // грн/кВт·год — тариф розряду (пік/день)
  offPeakTariff: 6.0,        // грн/кВт·год — тариф заряду (ніч/дешево)
  includeAncillary: true,    // враховувати аРВЧ-контракт
  ancillaryRatePerMWh: 3400000, // грн/МВт·год/рік (~$85k при курсі ~40)
  bessCapex: 10800000,       // грн (CAPEX УЗЕ, ~$270k × 40)
  bessOpex: 3.0,             // % від CAPEX/рік

  // ── СЕС+УЗЕ комбо ──────────────────────────────────────────────────────────
  solarToStorage: 0.6,       // частка надлишкової сонячної генерації → УЗЕ
};

// Спільний об'єкт DEF для відображення як capex/opex для зворотної сумісності
// (legacy: деякі компоненти звертаються до P.capex)
Object.defineProperty(DEF, 'capex', { get() { return this.pvCapex; }, enumerable: false });
Object.defineProperty(DEF, 'opex', { get() { return this.pvOpex; }, enumerable: false });

// ─── Допоміжні функції ────────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// ─── Режим 1: Тільки СЕС ─────────────────────────────────────────────────
// Генерація + self-use + продаж надлишку по тарифу
export function calcSolar(p) {
  const pvMW          = Math.max(0, p.pvMW ?? 1);
  const specificYield = Math.max(0, p.specificYield ?? 1100);
  const selfUseShare  = clamp(p.selfUseShare ?? 0.6, 0, 1);
  const degradation   = clamp(p.degradation ?? 0.7, 0, 100);
  const gridPrice     = Math.max(0, p.gridPrice ?? 7.2);
  const feedInTariff  = Math.max(0, p.feedInTariff ?? 4.2);
  const capex         = Math.max(0, p.pvCapex ?? p.capex ?? 28000000);
  const opexPct       = Math.max(0, p.pvOpex ?? p.opex ?? 1.5);

  // Рік 1
  const year1Gen      = pvMW * 1000 * specificYield;   // кВт·год
  const selfUseKwh    = year1Gen * selfUseShare;
  const exportKwh     = year1Gen - selfUseKwh;
  const savings       = selfUseKwh * gridPrice;         // грн — заміщення мережі
  const exportRevenue = exportKwh * feedInTariff;       // грн — продаж надлишку
  const totalRevenue  = savings + exportRevenue;
  const opexCost      = capex * (opexPct / 100);
  const net           = totalRevenue - opexCost;

  // Cashflow 15 років
  const cf = [-(capex / 1e6)];
  let cumulative = -(capex / 1e6);
  const yearly = [];
  let pb = null;

  for (let year = 1; year <= 15; year += 1) {
    const degFactor  = Math.pow(1 - degradation / 100, year - 1);
    const gen        = year1Gen * degFactor;
    const ySelfUse   = gen * selfUseShare;
    const yExport    = gen - ySelfUse;
    const yNet       = ySelfUse * gridPrice + yExport * feedInTariff - opexCost;

    cumulative += yNet / 1e6;
    cf.push(+cumulative.toFixed(2));
    yearly.push({ year, gen, net: yNet, degFactor });
    if (pb === null && cumulative >= 0) pb = year;
  }

  const totalGen15y = yearly.reduce((acc, y) => acc + y.gen, 0);
  const lcoe = totalGen15y > 0 ? (capex + opexCost * 15) / totalGen15y : 0;

  return {
    calcType: 'solar',
    year1Gen, selfUseKwh, exportKwh,
    savings, exportRevenue, totalRevenue,
    opexCost, net, pb, cf, yearly, lcoe,
    capex,
    // для сумісності з існуючими компонентами
    directExportKwh: exportKwh,
    directExportRevenue: exportRevenue,
    reserveInKwh: 0, reserveOutKwh: 0, reserveLossKwh: 0,
    reserveExportRevenue: 0, reserveRevenue: 0,
    arbitrageRevenue: 0, ancillaryRevenue: 0,
  };
}

// ─── Режим 2: Тільки УЗЕ ─────────────────────────────────────────────────
// Арбітраж (заряд у дешевий час → розряд у дорогий) + аРВЧ (плата за готовність)
export function calcBess(p) {
  const bessCapMWh       = Math.max(0, p.bessCapacityMWh ?? 1);
  const roundTripEff     = clamp(p.roundTripEff ?? 0.90, 0.5, 1);
  const bessDegrad       = clamp(p.bessDegrad ?? 2.0, 0, 100);
  const cyclesPerYear    = Math.max(0, p.cyclesPerYear ?? 250);
  const peakTariff       = Math.max(0, p.peakTariff ?? 16.0);
  const offPeakTariff    = Math.max(0, p.offPeakTariff ?? 6.0);
  const includeAncillary = p.includeAncillary ?? true;
  const ancRate          = Math.max(0, p.ancillaryRatePerMWh ?? 3400000);
  const capex            = Math.max(0, p.bessCapex ?? p.capex ?? 10800000);
  const opexPct          = Math.max(0, p.bessOpex ?? p.opex ?? 3.0);

  // Рік 1
  const chargeKwh1       = bessCapMWh * 1000 * cyclesPerYear;
  const dischargeKwh1    = chargeKwh1 * roundTripEff;
  const arbitrageRev1    = dischargeKwh1 * peakTariff - chargeKwh1 * offPeakTariff;
  const ancillaryRev1    = includeAncillary ? bessCapMWh * ancRate : 0;
  const opexCost         = capex * (opexPct / 100);
  const totalRevenue1    = arbitrageRev1 + ancillaryRev1;
  const net1             = totalRevenue1 - opexCost;

  // Cashflow 15 років (деградація ємності)
  const cf = [-(capex / 1e6)];
  let cumulative = -(capex / 1e6);
  const yearly = [];
  let pb = null;

  for (let year = 1; year <= 15; year += 1) {
    const degFactor     = Math.pow(1 - bessDegrad / 100, year - 1);
    const yCapMWh       = bessCapMWh * degFactor;
    const yCharge       = yCapMWh * 1000 * cyclesPerYear;
    const yDischarge    = yCharge * roundTripEff;
    const yArbitrage    = yDischarge * peakTariff - yCharge * offPeakTariff;
    const yAncillary    = includeAncillary ? yCapMWh * ancRate : 0;
    const yNet          = yArbitrage + yAncillary - opexCost;

    cumulative += yNet / 1e6;
    cf.push(+cumulative.toFixed(2));
    yearly.push({ year, chargeKwh: yCharge, dischargeKwh: yDischarge, arbitrage: yArbitrage, ancillary: yAncillary, net: yNet, degFactor });
    if (pb === null && cumulative >= 0) pb = year;
  }

  // Для BESS немає генерації у вигляді МВт·год, але lcoe зберігаємо як умовний показник
  const totalDischarge = yearly.reduce((acc, y) => acc + y.dischargeKwh, 0);
  const lcoe = totalDischarge > 0 ? (capex + opexCost * 15) / totalDischarge : 0;

  return {
    calcType: 'bess',
    bessCapMWh,
    chargeKwh: chargeKwh1,
    dischargeKwh: dischargeKwh1,
    arbitrageRevenue: arbitrageRev1,
    ancillaryRevenue: ancillaryRev1,
    totalRevenue: totalRevenue1,
    opexCost, net: net1, pb, cf, yearly, lcoe,
    capex,
    // для сумісності
    year1Gen: 0, selfUseKwh: 0, exportKwh: 0,
    savings: 0, exportRevenue: 0,
    directExportKwh: 0, directExportRevenue: 0,
    reserveInKwh: chargeKwh1, reserveOutKwh: dischargeKwh1,
    reserveLossKwh: chargeKwh1 - dischargeKwh1,
    reserveExportRevenue: 0, reserveRevenue: 0,
  };
}

// ─── Режим 3: СЕС + УЗЕ ──────────────────────────────────────────────────
// Генерація → self-use + заряд УЗЕ від сонця → розряд у пік + аРВЧ
// УЗЕ також може дозаряджатись від мережі по нічному тарифу
export function calcSolarBess(p) {
  const pvMW             = Math.max(0, p.pvMW ?? 1);
  const specificYield    = Math.max(0, p.specificYield ?? 1100);
  const selfUseShare     = clamp(p.selfUseShare ?? 0.6, 0, 1);
  const pvDegrad         = clamp(p.degradation ?? 0.7, 0, 100);
  const gridPrice        = Math.max(0, p.gridPrice ?? 7.2);
  const feedInTariff     = Math.max(0, p.feedInTariff ?? 4.2);
  const pvCapex          = Math.max(0, p.pvCapex ?? 28000000);
  const pvOpexPct        = Math.max(0, p.pvOpex ?? 1.5);

  const bessCapMWh       = Math.max(0, p.bessCapacityMWh ?? 1);
  const roundTripEff     = clamp(p.roundTripEff ?? 0.90, 0.5, 1);
  const bessDegrad       = clamp(p.bessDegrad ?? 2.0, 0, 100);
  const cyclesPerYear    = Math.max(0, p.cyclesPerYear ?? 250);
  const peakTariff       = Math.max(0, p.peakTariff ?? 16.0);
  const offPeakTariff    = Math.max(0, p.offPeakTariff ?? 6.0);
  const includeAncillary = p.includeAncillary ?? true;
  const ancRate          = Math.max(0, p.ancillaryRatePerMWh ?? 3400000);
  const bessCapex        = Math.max(0, p.bessCapex ?? 10800000);
  const bessOpexPct      = Math.max(0, p.bessOpex ?? 3.0);

  const solarToStorage   = clamp(p.solarToStorage ?? 0.6, 0, 1);

  const totalCapex       = pvCapex + bessCapex;
  const pvOpexCost       = pvCapex * (pvOpexPct / 100);
  const bessOpexCost     = bessCapex * (bessOpexPct / 100);
  const totalOpex        = pvOpexCost + bessOpexCost;

  // Рік 1
  const year1Gen         = pvMW * 1000 * specificYield;
  const selfUseKwh       = year1Gen * selfUseShare;
  const exportKwh        = year1Gen - selfUseKwh;

  // УЗЕ заряджається від сонця (безкоштовно) та дозаряджається від мережі
  const bessTotalNeedKwh = bessCapMWh * 1000 * cyclesPerYear;
  const solarChargeKwh   = Math.min(exportKwh * solarToStorage, bessTotalNeedKwh);
  const gridChargeKwh    = Math.max(0, bessTotalNeedKwh - solarChargeKwh);
  const totalChargeKwh   = solarChargeKwh + gridChargeKwh;
  const dischargeKwh     = totalChargeKwh * roundTripEff;

  // Залишок сонячної генерації після заряду батареї → продаж в мережу
  const directExportKwh  = Math.max(0, exportKwh - solarChargeKwh);

  // Доходи
  const savings          = selfUseKwh * gridPrice;
  const directExportRev  = directExportKwh * feedInTariff;
  const gridChargeCost   = gridChargeKwh * offPeakTariff;
  const dischargeRevenue = dischargeKwh * peakTariff;
  const ancillaryRevenue = includeAncillary ? bessCapMWh * ancRate : 0;

  const totalRevenue     = savings + directExportRev + dischargeRevenue + ancillaryRevenue - gridChargeCost;
  const net              = totalRevenue - totalOpex;

  // Cashflow 15 років
  const cf = [-(totalCapex / 1e6)];
  let cumulative = -(totalCapex / 1e6);
  const yearly = [];
  let pb = null;

  for (let year = 1; year <= 15; year += 1) {
    const pvDeg          = Math.pow(1 - pvDegrad / 100, year - 1);
    const bessDeg        = Math.pow(1 - bessDegrad / 100, year - 1);
    const yGen           = year1Gen * pvDeg;
    const ySelfUse       = yGen * selfUseShare;
    const yExport        = yGen - ySelfUse;
    const yBessNeed      = bessCapMWh * bessDeg * 1000 * cyclesPerYear;
    const ySolarCharge   = Math.min(yExport * solarToStorage, yBessNeed);
    const yGridCharge    = Math.max(0, yBessNeed - ySolarCharge);
    const yDischarge     = (ySolarCharge + yGridCharge) * roundTripEff;
    const yDirectExport  = Math.max(0, yExport - ySolarCharge);
    const yAncillary     = includeAncillary ? bessCapMWh * bessDeg * ancRate : 0;
    const yNet           = ySelfUse * gridPrice + yDirectExport * feedInTariff
                          + yDischarge * peakTariff - yGridCharge * offPeakTariff
                          + yAncillary - totalOpex;

    cumulative += yNet / 1e6;
    cf.push(+cumulative.toFixed(2));
    yearly.push({ year, gen: yGen, net: yNet, degFactor: pvDeg, solarCharge: ySolarCharge, gridCharge: yGridCharge, discharge: yDischarge });
    if (pb === null && cumulative >= 0) pb = year;
  }

  const totalGen15y = yearly.reduce((acc, y) => acc + y.gen, 0);
  const lcoe = totalGen15y > 0 ? (totalCapex + totalOpex * 15) / totalGen15y : 0;

  return {
    calcType: 'solar_bess',
    year1Gen, selfUseKwh, exportKwh: directExportKwh,
    solarChargeKwh, gridChargeKwh, dischargeKwh,
    savings, directExportRevenue: directExportRev,
    gridChargeCost, dischargeRevenue, ancillaryRevenue,
    totalRevenue, opexCost: totalOpex, net, pb, cf, yearly, lcoe,
    capex: totalCapex, pvCapex, bessCapex,
    // для сумісності
    directExportKwh, exportRevenue: directExportRev + dischargeRevenue,
    reserveInKwh: solarChargeKwh + gridChargeKwh,
    reserveOutKwh: dischargeKwh,
    reserveLossKwh: (solarChargeKwh + gridChargeKwh) - dischargeKwh,
    reserveExportRevenue: dischargeRevenue,
    reserveRevenue: dischargeRevenue - gridChargeCost,
    arbitrageRevenue: dischargeRevenue - gridChargeCost,
  };
}

// ─── Спільна точка входу ──────────────────────────────────────────────────
export function calc(p) {
  switch (p?.calcType) {
    case 'bess':       return calcBess(p);
    case 'solar_bess': return calcSolarBess(p);
    case 'solar':
    default:           return calcSolar(p);
  }
}
