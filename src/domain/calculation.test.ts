import { describe, expect, it } from "vitest";
import { calculateScenario, comparePurchases } from "./calculation";
import { BASE } from "./presets";
import { BONUS_MILES } from "./purchases";

const regular = { card: false, goWild: false, discountDen: false };
const pass = { ...regular, goWild: true };
const scenario = {
	...BASE,
	weekends: 1,
	optionalWeekends: 1,
	replacePct: 100,
	optionalOut: "late" as const,
	optionalReturn: "advance" as const,
	fareFri: 100,
	fareSun: 100,
	christmasFare: 305,
	christmasGoWildQuote: 0,
	denSavingPerLeg: 0,
	gwTaxes: 15,
	lateSuccessFri: 100,
	peakShareFri: 0,
	peakShareSun: 0,
	carryShare: 0,
	checkedShare: 0,
};

describe("scenario calculation", () => {
	it("counts one discounted Friday and a regular return", () => {
		expect(calculateScenario(scenario, pass).weekendCost).toBe(115);
	});
	it("reports skipped visits and charges only the forfeited booking and fixed costs", () => {
		const result = calculateScenario({ ...scenario, lateSuccessFri: 0 }, pass);
		expect(result.weekendCost).toBe(100);
		expect(result.skippedVisits).toBe(1);
		expect(result.totalCost).toBe(399 + 305 + 100);
	});
	it("charges a last-minute Sunday backup after arrival", () => {
		const result = calculateScenario(
			{
				...scenario,
				optionalReturn: "late-backup",
				lateSuccessSun: 0,
				lateFareSun: 250,
			},
			pass,
		);
		expect(result.weekendCost).toBe(265);
		expect(result.optionalSundayBackups).toBe(1);
	});
	it("does not rank a pass cheaper solely because planned paid visits were skipped", () => {
		const [withoutPass, , withPass] = comparePurchases(
			{
				...scenario,
				weekends: 10,
				optionalWeekends: 10,
				lateSuccessFri: 0,
				sunkReturnPct: 0,
			},
			false,
		);
		expect(withPass.totalCost).toBeLessThan(withoutPass.totalCost);
		expect(withPass.comparisonCost - withoutPass.comparisonCost).toBe(399);
	});
	it("adds back only the missed visits that would have been paid for", () => {
		const [, , withPass, withPassAndDen] = comparePurchases(
			{
				...scenario,
				replacePct: 50,
				lateSuccessFri: 50,
				denSavingPerLeg: 10,
			},
			false,
		);
		expect(withPass.comparisonCost - withPass.totalCost).toBe(50);
		expect(withPassAndDen.comparisonCost - withPassAndDen.totalCost).toBe(50);
	});
	it("charges the optional return premium on completed trips and applies recovery on skipped trips", () => {
		const result = calculateScenario(
			{
				...scenario,
				lateSuccessFri: 50,
				optionalReturnFlexPremium: 20,
				sunkReturnPct: 50,
			},
			pass,
		);
		expect(result.sunkExposure).toBe(30);
		expect(result.weekendCost).toBe(97.5);
	});
	it("does not charge the optional return premium on committed trips", () => {
		const result = calculateScenario(
			{
				...scenario,
				optionalWeekends: 0,
				committedOut: "advance",
				committedReturn: "advance",
				optionalReturnFlexPremium: 20,
			},
			pass,
		);
		expect(result.weekendCost).toBe(200);
	});
	it("applies the Den fare discount to cash fares and preserves the Christmas booking", () => {
		const baseline = calculateScenario(scenario, regular);
		const withDen = calculateScenario(
			{ ...scenario, denSavingPerLeg: 20 },
			{ ...regular, discountDen: true },
		);
		expect(withDen.totalCost - baseline.totalCost).toBeCloseTo(-20.01);
		expect(withDen.expectedGwLegs).toBe(0);
	});
	it("charges both membership costs and applies the pass discount only once", () => {
		const withCard = calculateScenario(scenario, {
			...pass,
			card: true,
			discountDen: true,
		});
		expect(withCard.fixedCost).toBeCloseTo(349 + 100 + 59.99);
		expect(
			calculateScenario(scenario, { ...pass, discountDen: true }).fixedCost,
		).toBeCloseTo(349 + 59.99);
	});
	it("uses bonus miles on paid fares and deducts each redemption only once", () => {
		const result = calculateScenario(scenario, { ...pass, card: true });
		expect(result.awardFlights).toBe(1);
		expect(result.awardSavings).toBeCloseTo(94.4);
		expect(result.remainingMiles).toBeCloseTo(40_000 + result.milesEarned);
		expect(result.totalCost).toBeCloseTo(449 + 305 + 115 - 94.4);
	});
	it("earns miles on cash bookings and uses them for later awards", () => {
		const result = calculateScenario(
			{
				...scenario,
				weekends: 2,
				optionalWeekends: 0,
				christmasFare: 0,
				awardMilesPerFlight: 200,
			},
			regular,
		);
		expect(result.awardFlights).toBe(1);
		expect(result.awardSavings).toBeCloseTo(94.4);
		expect(result.milesEarned).toBe(300);
		expect(result.remainingMiles).toBe(100);
	});
	it("keeps miles when an award would cost more than the cash fare", () => {
		const result = calculateScenario(
			{ ...scenario, fareFri: 4, fareSun: 5 },
			{ ...regular, card: true },
		);
		expect(result.awardFlights).toBe(0);
		expect(result.remainingMiles).toBeCloseTo(BONUS_MILES + result.milesEarned);
	});

	it("waives checked baggage with the card and retains carry-on costs", () => {
		const input = {
			...scenario,
			checkedShare: 100,
			carryShare: 100,
			regularCarry: 20,
			gwCarry: 40,
		};
		expect(calculateScenario(input, pass).weekendCost).toBe(285);
		expect(calculateScenario(input, { ...pass, card: true }).weekendCost).toBe(
			175,
		);
	});
	it("waives regular and GoWild carry-on fees when the card's Gold status applies", () => {
		const input = {
			...scenario,
			carryShare: 100,
			regularCarry: 20,
			gwCarry: 40,
		};
		const cardPass = { ...pass, card: true };
		expect(calculateScenario(input, cardPass, true).weekendCost).toBe(115);
		expect(calculateScenario(input, cardPass).weekendCost).toBe(175);
		expect(calculateScenario(input, pass, true).weekendCost).toBe(175);
	});
	it("uses a confirmed Christmas GoWild quote only when it lowers the holiday cost", () => {
		expect(
			calculateScenario({ ...scenario, christmasGoWildQuote: 180 }, pass)
				.christmasCost,
		).toBe(180);
		expect(
			calculateScenario({ ...scenario, christmasGoWildQuote: 400 }, pass)
				.christmasCost,
		).toBe(305);
		expect(
			calculateScenario({ ...scenario, christmasGoWildQuote: 180 }, regular)
				.christmasCost,
		).toBe(305);
	});
	it("shares the welcome-mile budget between flight awards and eligible extras", () => {
		const input = {
			...scenario,
			weekends: 4,
			carryShare: 100,
			ancillaryAwardMiles: 20_000,
			ancillaryAwardValue: 80,
		};
		const result = calculateScenario(input, { ...regular, card: true });
		expect(result.awardFlights).toBe(3);
		expect(result.ancillarySavings).toBe(80);
		expect(result.remainingMiles).toBeCloseTo(
			BONUS_MILES +
				result.milesEarned -
				input.ancillaryAwardMiles -
				result.awardFlights * input.awardMilesPerFlight,
		);
	});
});
