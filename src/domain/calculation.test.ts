import { describe, expect, it } from 'vitest';
import { calculateScenario } from './calculation';
import { BASE } from './presets';

const scenario = { ...BASE, weekends: 1, optionalWeekends: 1, replacePct: 100, optionalOut: 'late' as const, optionalReturn: 'advance' as const, fareFri: 100, fareSun: 100, gwTaxes: 15, passPrice: 0, annualFriction: 0, lateSuccessFri: 100, peakShareFri: 0, peakShareSun: 0, carryShare: 0, checkedShare: 0 };

describe('scenario calculation', () => {
  it('counts one discounted Friday and a regular return', () => {
    expect(calculateScenario(scenario).netCash).toBe(85);
  });
  it('skips unavailable optional departures and forfeits the prepaid return', () => {
    const result = calculateScenario({ ...scenario, lateSuccessFri: 0 });
    expect(result.netCash).toBe(-100);
    expect(result.skippedVisits).toBe(1);
  });
  it('charges a last-minute Sunday backup after arrival', () => {
    const result = calculateScenario({ ...scenario, optionalReturn: 'late-backup', lateSuccessSun: 0, lateFareSun: 250 });
    expect(result.netCash).toBe(-65);
  });
  it('includes the difference in baggage prices', () => {
    const result = calculateScenario({ ...scenario, carryShare: 100, regularCarry: 20, gwCarry: 40 });
    expect(result.netCash).toBe(65);
  });
});
