import type { Stock } from './types';

/** Deterministic pseudo-random for stable mock data */
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

const TICKER_PREFIX: Record<Stock['sector'], string> = {
  Tech: 'T',
  Healthcare: 'H',
  Finance: 'F',
  Energy: 'E',
  Consumer: 'C',
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
      const prefix = TICKER_PREFIX[sector];
      const ticker = `${prefix}${(idx + 1).toString().padStart(2, '0')}`;

      stocks.push({
        ticker,
        companyName,
        sector,
        peRatio: range(rng, 5, 100, 1),
        epsGrowth: range(rng, -20, 100, 1),
        debtToEquity: range(rng, 0, 5, 2),
        rsi: range(rng, 10, 90, 0),
        price: range(rng, 18, 420, 2),
        annualizedReturn: range(rng, -18, 52, 1),
      });
      idx++;
    }
  }

  return stocks;
}

export const MOCK_STOCKS: Stock[] = buildStocks();
