import {
	BONUS_MILES,
	CARD_FEE,
	DEFAULT_PURCHASES,
	DEN_FEE,
	type Purchases,
	passCost,
} from "./purchases";
import type {
	CommittedMode,
	LegPlan,
	OutPlan,
	Result,
	Scenario,
} from "./types";

const pct = (n: number) => Math.min(1, Math.max(0, n / 100));

export function calculateScenario(
	s: Scenario,
	purchases: Purchases = DEFAULT_PURCHASES,
	denEnrollment = 0,
	gold = false,
): Result {
	const { card, goWild, discountDen } = purchases;
	const denSaving = discountDen ? s.denSavingPerLeg : 0;
	const baseBag =
		(card && gold ? 0 : pct(s.carryShare) * s.regularCarry) +
		(card ? 0 : pct(s.checkedShare) * s.regularChecked);
	const passBag =
		(card && gold ? 0 : pct(s.carryShare) * s.gwCarry) +
		(card ? 0 : pct(s.checkedShare) * s.gwChecked);
	const fare = (dir: "fri" | "sun", late = false) =>
		Math.max(
			0,
			(late
				? dir === "fri"
					? s.lateFareFri
					: s.lateFareSun
				: dir === "fri"
					? s.fareFri
					: s.fareSun) - denSaving,
		);
	const base = (dir: "fri" | "sun") => fare(dir) + baseBag;
	const earlyProb = (dir: "fri" | "sun") =>
		pct(dir === "fri" ? s.earlyOfferFri : s.earlyOfferSun);
	const lateProb = (dir: "fri" | "sun") =>
		pct(dir === "fri" ? s.lateSuccessFri : s.lateSuccessSun);
	const gwFare = (dir: "fri" | "sun", early: boolean) => {
		const fee = early ? (dir === "fri" ? s.earlyFeeFri : s.earlyFeeSun) : 0;
		const peakShare = pct(dir === "fri" ? s.peakShareFri : s.peakShareSun);
		const peak = dir === "fri" ? s.peakChargeFri : s.peakChargeSun;
		const combined =
			s.feeStack === "sum"
				? fee + peakShare * peak
				: (1 - peakShare) * fee + peakShare * Math.max(fee, peak);
		return s.gwTaxes + passBag + s.seatExtra + combined;
	};
	const earlyEffective = (dir: "fri" | "sun") =>
		gwFare(dir, true) < base(dir) ? earlyProb(dir) : 0;
	const avoidableFare = (dir: "fri" | "sun", late = false) =>
		Math.max(0, fare(dir, late) - s.awardFees);
	const advance = (dir: "fri" | "sun"): LegPlan => ({
		cost: base(dir),
		gw: 0,
		prepaid: base(dir),
		awardableFare: avoidableFare(dir),
		note: "Regular Frontier booked in advance",
	});
	const earlyAdvance = (dir: "fri" | "sun"): LegPlan => {
		const p = earlyEffective(dir);
		const cost = p * gwFare(dir, true) + (1 - p) * base(dir);
		return {
			cost,
			gw: p,
			prepaid: cost,
			awardableFare: (1 - p) * avoidableFare(dir),
			note: "Try early GoWild, then buy an advance fare if needed",
		};
	};
	const lateBackup = (dir: "fri" | "sun"): LegPlan => {
		const p = lateProb(dir);
		return {
			cost: p * gwFare(dir, false) + (1 - p) * (fare(dir, true) + baseBag),
			gw: p,
			prepaid: 0,
			awardableFare: (1 - p) * avoidableFare(dir, true),
			note: "Try day-before GoWild, then buy a last-minute ticket if needed",
		};
	};
	const earlyLateBackup = (dir: "fri" | "sun"): LegPlan => {
		const p = earlyEffective(dir);
		const earlyCost = p * gwFare(dir, true);
		const backup = lateBackup(dir);
		return {
			cost: earlyCost + (1 - p) * backup.cost,
			gw: p + (1 - p) * backup.gw,
			prepaid: earlyCost,
			awardableFare: (1 - p) * backup.awardableFare,
			note: "Try early and day-before GoWild, then buy a last-minute ticket if needed",
		};
	};
	const committed = (dir: "fri" | "sun", mode: CommittedMode): LegPlan => {
		if (!goWild || mode === "advance") return advance(dir);
		return mode === "early-advance" ? earlyAdvance(dir) : lateBackup(dir);
	};
	const optionalOutbound = (): OutPlan => {
		if (!goWild || s.optionalOut === "advance") {
			return {
				probability: 1,
				weightedCost: base("fri"),
				weightedGw: 0,
				awardableFare: avoidableFare("fri"),
				detail: "Buy the Friday advance fare for planned visits",
			};
		}
		const early = s.optionalOut === "late" ? 0 : earlyEffective("fri");
		const late = s.optionalOut === "early" ? 0 : (1 - early) * lateProb("fri");
		return {
			probability: early + late,
			weightedGw: early + late,
			weightedCost: early * gwFare("fri", true) + late * gwFare("fri", false),
			awardableFare: 0,
			detail:
				"Skip the optional weekend if the chosen GoWild booking strategy fails",
		};
	};
	const out = optionalOutbound();
	const optionalReturn =
		!goWild || s.optionalReturn === "advance"
			? advance("sun")
			: s.optionalReturn === "early-advance"
				? earlyAdvance("sun")
				: s.optionalReturn === "late-backup"
					? lateBackup("sun")
					: earlyLateBackup("sun");
	const prepaidProbability = !goWild
		? 0
		: s.optionalReturn === "advance" || s.optionalReturn === "early-advance"
			? 1
			: s.optionalReturn === "early-late-backup"
				? earlyEffective("sun")
				: 0;
	optionalReturn.cost += prepaidProbability * s.optionalReturnFlexPremium;
	optionalReturn.prepaid += prepaidProbability * s.optionalReturnFlexPremium;

	const commFri = committed("fri", s.committedOut);
	const commSun = committed("sun", s.committedReturn);
	const optionalCount = Math.min(s.weekends, s.optionalWeekends);
	const committedCount = s.weekends - optionalCount;
	const replacement = pct(s.replacePct);
	const attempted = goWild ? optionalCount : optionalCount * replacement;
	const completed = attempted * out.probability;
	const skippedVisits = attempted - completed;
	const sunkExposure =
		skippedVisits * optionalReturn.prepaid * pct(s.sunkReturnPct);
	const weekendCost =
		attempted * out.weightedCost +
		completed * optionalReturn.cost +
		committedCount * (commFri.cost + commSun.cost) +
		sunkExposure;
	const expectedGwLegs =
		attempted * out.weightedGw +
		completed * optionalReturn.gw +
		committedCount * (commFri.gw + commSun.gw);
	const successVisits = committedCount + completed;
	const regularLegs = Math.max(0, 2 * successVisits - expectedGwLegs);
	const ancillarySavings =
		card && s.ancillaryAwardMiles > 0 && s.ancillaryAwardMiles <= BONUS_MILES
			? Math.min(
					s.ancillaryAwardValue,
					regularLegs * baseBag + expectedGwLegs * (passBag + s.seatExtra),
				)
			: 0;
	const ancillaryMiles = ancillarySavings > 0 ? s.ancillaryAwardMiles : 0;
	const flightMiles = BONUS_MILES - ancillaryMiles;
	const awardFlights =
		card && s.awardMilesPerFlight > 0
			? Math.min(
					regularLegs * pct(s.awardFlightShare),
					flightMiles / s.awardMilesPerFlight,
				)
			: 0;
	const awardableFare =
		attempted * out.awardableFare +
		completed * optionalReturn.awardableFare +
		committedCount * (commFri.awardableFare + commSun.awardableFare);
	const awardSavings =
		regularLegs > 0 ? (awardFlights / regularLegs) * awardableFare : 0;
	const christmasRegular =
		Math.max(0, s.christmasFare - 2 * denSaving) + 2 * baseBag;
	const christmasUsesGoWild =
		goWild &&
		s.christmasGoWildQuote > 0 &&
		s.christmasGoWildQuote < christmasRegular;
	const christmasCost = christmasUsesGoWild
		? s.christmasGoWildQuote
		: christmasRegular;
	const fixedCost =
		(card ? CARD_FEE : 0) +
		(discountDen ? DEN_FEE + denEnrollment : 0) +
		(goWild ? passCost(purchases) + s.annualFriction : 0);
	const totalCost =
		fixedCost + christmasCost + weekendCost - awardSavings - ancillarySavings;

	return {
		committedCount,
		optionalCount,
		successVisits,
		skippedVisits,
		expectedGwLegs,
		awardFlights,
		awardSavings,
		ancillarySavings,
		remainingBonusMiles: card
			? flightMiles - awardFlights * s.awardMilesPerFlight
			: 0,
		fixedCost,
		christmasCost,
		weekendCost,
		totalCost,
		extraVisitValue: goWild
			? completed * (1 - replacement) * s.incrementalVisitValue
			: 0,
		expectedPaidLegs:
			(christmasUsesGoWild ? 0 : 2) + regularLegs - awardFlights,
		sunkExposure,
		optionalOut: out,
		optionalReturn,
		commFri,
		commSun,
	};
}
