import type { Stock } from './types';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function range(rng: () => number, min: number, max: number, decimals = 1): number {
  const v = min + rng() * (max - min);
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function tickerFromName(name: string, sector: string, idx: number): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  let base = words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  if (base.length < 2) base = sector.slice(0, 2).toUpperCase();
  return `${base}${idx}`.slice(0, 5);
}

const SECTOR_POOL: Stock['sector'][] = ['Tech', 'Healthcare', 'Finance', 'Energy', 'Consumer'];

const COMPANY_NAMES: Record<Stock['sector'], string[]> = {
  Tech: [
    'NexaLogic Systems', 'CloudPeak Analytics', 'QuantumByte Inc', 'DataForge Labs',
    'PixelStream Media', 'Synapse Networks', 'Orbital Software', 'CipherWave Tech',
    'NovaStack Solutions', 'Aether Dynamics', 'Helix Robotics', 'PrismAI Corp',
  ],
  Healthcare: [
    'VitaCore Therapeutics', 'MedNova Diagnostics', 'BioHarmony Health', 'PulseCare Medical',
    'GenomePath Labs', 'ClearSight Pharma', 'WellSpring Biologics', 'CardioLink Systems',
    'ImmunoPrime Inc', 'NeuroVantage Health', 'OrthoFlex Devices', 'LifeSpan Clinics',
  ],
  Finance: [
    'Summit Capital Group', 'HarborTrust Bank', 'Meridian Asset Mgmt', 'Pinnacle Securities',
    'Atlas Insurance Co', 'Sterling Credit Union', 'IronGate Holdings', 'Crestline Financial',
    'NorthStar Lending', 'EquityBridge Partners', 'VaultStone REIT', 'PrimeLedger Corp',
  ],
  Energy: [
    'Solaris Power Co', 'TerraFuel Resources', 'WindRidge Energy', 'BlueFlame Gas',
    'GeoThermal Partners', 'Pacific Pipeline', 'CarbonShift Renewables', 'Apex Drilling',
    'GridLink Utilities', 'HydroSpan Inc', 'Ember Coal & Power', 'GreenVolt Storage',
  ],
  Consumer: [
    'FreshMart Retail', 'UrbanStyle Brands', 'HomeNest Furnishings', 'TasteBud Foods',
    'Velocity Motors', 'PureGlow Cosmetics', 'TrailBlazer Outdoors', 'PlayZone Entertainment',
    'BrewCraft Beverages', 'LuxLane Apparel', 'PetPals Supplies', 'SwiftShip Logistics',
  ],
};

function buildStocks(): Stock[] {
  const rng = seeded(42);
  const stocks: Stock[] = [];
  let idx = 0;

  for (const sector of SECTOR_POOL) {
    const names = [...COMPANY_NAMES[sector]];
    const count = sector === 'Tech' ? 12 : 11;

    for (let i = 0; i < count; i++) {
      const nameIdx = Math.floor(rng() * names.length);
      const companyName = names.splice(nameIdx, 1)[0] ?? `${sector} Corp ${i + 1}`;
      const price = range(rng, 18, 420, 2);
      const sharesM = range(rng, 50, 8000, 0);
      const marketCap = Math.round(price * sharesM);
      const peRatio = range(rng, 5, 100, 1);
      const priceChange52w = range(rng, -45, 120, 1);

      stocks.push({
        ticker: tickerFromName(companyName, sector, idx + 1),
        companyName,
        sector,
        peRatio,
        forwardPe: range(rng, 4, 90, 1),
        pegRatio: range(rng, 0.3, 4.5, 1),
        pbRatio: range(rng, 0.5, 12, 1),
        psRatio: range(rng, 0.5, 25, 1),
        pcfRatio: range(rng, 3, 45, 1),
        evToEbitda: range(rng, 4, 35, 1),
        epsGrowth: range(rng, -20, 100, 1),
        revenueGrowth: range(rng, -15, 60, 1),
        profitMargin: range(rng, -8, 35, 1),
        grossMargin: range(rng, 15, 85, 1),
        operatingMargin: range(rng, -15, 40, 1),
        roe: range(rng, -5, 45, 1),
        roa: range(rng, -8, 25, 1),
        roic: range(rng, -5, 35, 1),
        debtToEquity: range(rng, 0, 5, 2),
        debtToAssets: range(rng, 5, 75, 1),
        currentRatio: range(rng, 0.5, 4, 1),
        quickRatio: range(rng, 0.3, 3.5, 1),
        interestCoverage: range(rng, 0.5, 25, 1),
        dividendYield: range(rng, 0, 6, 2),
        payoutRatio: range(rng, 0, 95, 0),
        freeCashFlowYield: range(rng, -3, 15, 1),
        price,
        marketCap,
        priceChange1m: range(rng, -25, 35, 1),
        priceChange3m: range(rng, -35, 50, 1),
        priceChange6m: range(rng, -40, 70, 1),
        priceChange52w,
        priceVs52wHigh: range(rng, -55, 0, 1),
        priceVs52wLow: range(rng, 0, 150, 1),
        avgVolume: range(rng, 0.2, 25, 1),
        volatility30d: range(rng, 8, 65, 1),
        atrPercent: range(rng, 1, 12, 1),
        beta: range(rng, 0.4, 2.4, 2),
      });
      idx++;
    }
  }

  return stocks;
}

export const MOCK_STOCKS: Stock[] = buildStocks();
