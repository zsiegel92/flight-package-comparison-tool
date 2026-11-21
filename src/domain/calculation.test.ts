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
  it('charges the optional return premium on completed trips and applies recovery on skipped trips', () => {
    const result = calculateScenario({ ...scenario, lateSuccessFri: 50, optionalReturnFlexPremium: 20, sunkReturnPct: 50 });
    expect(result.sunkExposure).toBe(30);
    expect(result.netCash).toBe(2.5);
  });
  it('does not charge the premium on committed trips', () => {
    const result = calculateScenario({ ...scenario, optionalWeekends: 0, committedOut: 'advance', committedReturn: 'advance', optionalReturnFlexPremium: 20 });
    expect(result.netCash).toBe(0);
  });
  it('includes the Den membership cost and pass discount', () => {
    const baseline = calculateScenario({ ...scenario, passPrice: 399 }).netCash;
    const withDen = calculateScenario({ ...scenario, passPrice: 399, discountDen: true }).netCash;
    expect(withDen - baseline).toBeCloseTo(-19.99);
  });
  it('values card miles separately and applies the pass discount only once', () => {
    const withCard = calculateScenario({ ...scenario, passPrice: 399, card: true, discountDen: true, cardEligiblePct: 100, awardFlightShare: 0 });
    const withoutCard = calculateScenario({ ...scenario, passPrice: 399, discountDen: true });
    expect(withCard.netCash - withoutCard.netCash).toBeCloseTo(-99);
    expect(withCard.estimatedFrontierSpend).toBeCloseTo(533.99);
    expect(withCard.pointsValue).toBeCloseTo(590.7783);
    expect(withoutCard.pointsValue).toBe(0);
  });
  it('uses bonus miles for regular flights without valuing redeemed miles twice', () => {
    const result = calculateScenario({ ...scenario, card: true, cardEligiblePct: 0, awardFlightShare: 100 });
    expect(result.awardFlights).toBe(1);
    expect(result.awardSavings).toBeCloseTo(94.4);
    expect(result.pointsValue).toBe(450);
  });
  it('includes the difference in baggage prices', () => {
    const result = calculateScenario({ ...scenario, carryShare: 100, regularCarry: 20, gwCarry: 40 });
    expect(result.netCash).toBe(65);
  });
});
