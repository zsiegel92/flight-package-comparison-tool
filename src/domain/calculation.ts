import {
	AWARD_TAXES_AND_FEES,
	BONUS_MILES,
	CARD_FEE,
	DEFAULT_PURCHASES,
	DEN_FEE,
	mileageRates,
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
		Math.max(0, fare(dir, late) - AWARD_TAXES_AND_FEES);
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
	const christmasRegular =
		Math.max(0, s.christmasFare - 2 * denSaving) + 2 * baseBag;
	const christmasUsesGoWild =
		goWild &&
		s.christmasGoWildQuote > 0 &&
		s.christmasGoWildQuote < christmasRegular;
	const christmasCost = christmasUsesGoWild
		? s.christmasGoWildQuote
		: christmasRegular;
	const rates = mileageRates(card, gold);
	const passPurchase = goWild ? passCost(purchases) : 0;
	const startingMiles = card ? BONUS_MILES : 0;
	const milesFromInitialSpend =
		(passPurchase + (discountDen ? DEN_FEE : 0)) *
			(rates.membership + rates.cardSpend) +
		christmasCost * rates.cardSpend +
		(christmasUsesGoWild
			? 0
			: Math.max(0, christmasRegular - 2 * baseBag) * rates.basic);
	let milesEarned = milesFromInitialSpend;
	let milesBalance = startingMiles - ancillaryMiles + milesEarned;
	let awardFlights = 0;
	let awardSavings = 0;

	// Walk expected bookings in trip order. Earned miles become usable on a later leg.
	const bookLeg = (
		weight: number,
		cost: number,
		gw: number,
		awardableFare: number,
	) => {
		if (weight <= 0) return;
		const regularWeight = Math.max(0, weight - gw);
		const redeemed =
			regularWeight > 0 &&
			awardableFare > 0 &&
			s.awardMilesPerFlight > 0 &&
			milesBalance >= s.awardMilesPerFlight
				? regularWeight
				: 0;
		const savings = redeemed > 0 ? awardableFare : 0;
		awardFlights += redeemed;
		awardSavings += savings;
		const eligibleFare = Math.max(0, cost - gw * s.gwTaxes);
		const basicFare = Math.max(
			0,
			eligibleFare - savings - redeemed * AWARD_TAXES_AND_FEES,
		);
		const earned = (cost - savings) * rates.cardSpend + basicFare * rates.basic;
		milesEarned += earned;
		milesBalance += earned - redeemed * s.awardMilesPerFlight;
	};
	for (let i = 0; i < s.weekends; i++) {
		// Spread optional and committed trips evenly across the year.
		const isOptional =
			Math.floor(((i + 1) * optionalCount) / s.weekends) >
			Math.floor((i * optionalCount) / s.weekends);
		if (isOptional) {
			const weight = goWild ? 1 : replacement;
			bookLeg(
				weight * out.probability,
				weight * out.weightedCost,
				weight * out.weightedGw,
				weight * out.awardableFare,
			);
			const returnWeight = weight * out.probability;
			bookLeg(
				returnWeight,
				returnWeight * optionalReturn.cost,
				returnWeight * optionalReturn.gw,
				returnWeight * optionalReturn.awardableFare,
			);
		} else {
			bookLeg(1, commFri.cost, commFri.gw, commFri.awardableFare);
			bookLeg(1, commSun.cost, commSun.gw, commSun.awardableFare);
		}
	}
	const fixedCost =
		(card ? CARD_FEE : 0) +
		(discountDen ? DEN_FEE : 0) +
		(goWild ? passPurchase + s.annualFriction : 0);
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
		milesEarned,
		remainingMiles: milesBalance,
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
