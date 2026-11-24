export type OutMode = "late" | "early-late" | "early" | "advance";
export type ReturnMode =
	| "advance"
	| "early-advance"
	| "late-backup"
	| "early-late-backup";
export type CommittedMode = "advance" | "early-advance" | "late-backup";
export type Stack = "sum" | "max";
export interface Scenario {
	id: string;
	name: string;
	rationale: string;
	weekends: number;
	optionalWeekends: number;
	replacePct: number;
	optionalOut: OutMode;
	optionalReturn: ReturnMode;
	committedOut: CommittedMode;
	committedReturn: CommittedMode;
	fareFri: number;
	fareSun: number;
	lateFareFri: number;
	lateFareSun: number;
	christmasFare: number;
	christmasGoWildQuote: number;
	denSavingPerLeg: number;
	awardMilesPerFlight: number;
	awardFlightShare: number;
	awardFees: number;
	ancillaryAwardMiles: number;
	ancillaryAwardValue: number;
	gwTaxes: number;
	earlyFeeFri: number;
	earlyFeeSun: number;
	lateSuccessFri: number;
	lateSuccessSun: number;
	earlyOfferFri: number;
	earlyOfferSun: number;
	peakShareFri: number;
	peakShareSun: number;
	peakChargeFri: number;
	peakChargeSun: number;
	feeStack: Stack;
	carryShare: number;
	checkedShare: number;
	regularCarry: number;
	gwCarry: number;
	regularChecked: number;
	gwChecked: number;
	seatExtra: number;
	annualFriction: number;
	sunkReturnPct: number;
	optionalReturnFlexPremium: number;
	incrementalVisitValue: number;
}
export interface LegPlan {
	cost: number;
	gw: number;
	prepaid: number;
	awardableFare: number;
	note: string;
}
export interface OutPlan {
	probability: number;
	weightedCost: number;
	weightedGw: number;
	awardableFare: number;
	detail: string;
}
export interface Result {
	committedCount: number;
	optionalCount: number;
	successVisits: number;
	skippedVisits: number;
	awardFlights: number;
	awardSavings: number;
	remainingBonusMiles: number;
	ancillarySavings: number;
	fixedCost: number;
	christmasCost: number;
	weekendCost: number;
	totalCost: number;
	expectedPaidLegs: number;
	extraVisitValue: number;
	sunkExposure: number;
	expectedGwLegs: number;
	optionalOut: OutPlan;
	optionalReturn: LegPlan;
	commFri: LegPlan;
	commSun: LegPlan;
}
