import {
	AWARD_TAXES_AND_FEES,
	BONUS_MILES,
	CARD_FEE,
	DEN_FEE,
	PURCHASE_OPTIONS,
	type Purchases,
	passCost,
} from "./domain/purchases";
import type { Result, Scenario } from "./domain/types";
import { fmt } from "./format";

const dollars = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
});
const money = (amount: number) => dollars.format(amount);
export function purchaseIndex(p: Purchases) {
	return Number(p.card) * 4 + Number(p.goWild) * 2 + Number(p.discountDen);
}

const perks = [
	{
		name: "Two free checked bags",
		sources: ["card"],
		detail:
			"Primary cardholder on qualifying Frontier-operated bookings made directly with Frontier.",
		url: "https://faq.flyfrontier.com/help/frontier-airlines-world-mastercard-free-checked-bag-benefit-5d46762",
	},
	{
		name: "Free carry-on and Group 1 boarding",
		sources: ["gold"],
		detail: "Elite Gold benefits also apply to eligible GoWild bookings.",
		url: "https://faq.flyfrontier.com/help/im-already-a-frontier-miles-elite-member-do-i-enjoy-my-elite-benefits-on-tickets-booked-using-a-gowild-pass",
	},
	{
		name: "Cancel for travel credit without a fee",
		sources: ["gold"],
		detail:
			"For eligible 2026 bookings, Gold waives the fee if you cancel at least 7 days before departure. Verify eligibility if you booked before Gold posted. An Economy Fare or qualifying bundle also waives the fee. Basic fares booked now normally have a $149 fee each way without a waiver.",
		url: "https://www.flyfrontier.com/frontiermiles/terms-and-conditions/",
	},
	{
		name: "24-hour refund",
		sources: [],
		policyLabel: "Ticket policy",
		detail:
			"Refund to the original payment method if you cancel within 24 hours of booking and departure was at least 7 days away when you booked.",
		url: "https://faq.flyfrontier.com/help/can-i-get-a-refund-if-i-cancel-my-flight",
	},
	{
		name: "Elite seating upgrades",
		sources: ["gold"],
		detail:
			"For bookings from January 2027, eligible Economy or Premium bundles may get UpFront Plus or First Class upgrades 8 hours before departure. Economy can also qualify for premium seating.",
		url: "https://www.flyfrontier.com/frontiermiles/elite-status-benefits/?mobile=true",
	},
	{
		name: "Family pooling and priority customer care",
		sources: ["gold"],
		detail: "Included through Silver benefits inherited by Gold.",
		url: "https://www.flyfrontier.com/frontiermiles/elite-status-benefits/?mobile=true",
	},
	{
		name: "50,000 welcome miles",
		sources: ["card"],
		detail:
			"Your offer requires $500 in eligible purchases within 90 days. The model assumes you meet it and the miles post before weekend bookings.",
	},
	{
		name: "$50 off the GoWild pass",
		sources: ["card", "discountDen"],
		detail:
			"Eligible cardholders and Den members see $349 at checkout. One discount per pass.",
		url: "https://www.flyfrontier.com/deals/gowild-pass/",
	},
	{
		name: "Access to GoWild fares",
		sources: ["goWild"],
		detail:
			"For the passholder. Domestic standard booking opens the day before departure. Early booking and peak dates may cost extra. Booked GoWild tickets follow the applicable cancellation rules.",
		url: "https://www.flyfrontier.com/deals/gowild-pass/",
	},
	{
		name: "Lower fares for booking companions",
		sources: ["discountDen"],
		detail:
			"Share available Den fares with up to eight other people on the member’s reservation.",
		url: "https://www.flyfrontier.com/deals/discount-den/",
	},
	{
		name: "Kids Fly Free",
		sources: ["discountDen"],
		detail:
			"One child age 14 or younger per adult Den fare on eligible flights and dates.",
		url: "https://www.flyfrontier.com/kidsflyfree",
	},
	{
		name: "Adult companion travels for taxes and fees",
		sources: [],
		detail:
			"Requires Platinum or Diamond Frontier Miles status. Government taxes and fees start at $5.60.",
		url: "https://www.flyfrontier.com/frontiermiles/terms-and-conditions/",
	},
] as const;

const choices = [
	{ key: "card", name: "Frontier Mastercard" },
	{ key: "goWild", name: "GoWild" },
	{ key: "discountDen", name: "Discount Den" },
] as const;

const perkSources = [...choices, { key: "gold", name: "Gold" }] as const;
type PerkSource = (typeof perkSources)[number]["key"];

function productName(p: Purchases) {
	return (
		choices
			.filter(({ key }) => p[key])
			.map(({ name }) => name)
			.join(" + ") || "Regular fares only"
	);
}

interface ComparisonData {
	purchases: Purchases;
	scenarios: Scenario[];
	matrix: Result[][];
}

export function Recommendation({
	purchases,
	scenarios,
	matrix,
}: ComparisonData) {
	const caseIndex = Math.max(
		0,
		scenarios.findIndex(({ id }) => id === "middle"),
	);
	const central = matrix[caseIndex];
	const offset = purchases.card ? 4 : 0;
	const best =
		central
			?.slice(offset, offset + 4)
			.reduce(
				(winner, result, i) =>
					result.totalCost < central[winner].totalCost - 0.005
						? i + offset
						: winner,
				offset,
			) ?? offset;
	const recommendation = PURCHASE_OPTIONS[best];
	const noPass = central?.[offset + Number(recommendation.discountDen)];
	const withPass = central?.[offset + 2 + Number(recommendation.discountDen)];
	const passDelta = (noPass?.totalCost ?? 0) - (withPass?.totalCost ?? 0);
	const noDen = central?.[best - Number(recommendation.discountDen)];
	const withDen = central?.[best - Number(recommendation.discountDen) + 1];
	const denDelta = (noDen?.totalCost ?? 0) - (withDen?.totalCost ?? 0);
	const passDifferences = matrix.map(
		(row) => row[offset].totalCost - row[offset + 2].totalCost,
	);
	const favorable = passDifferences.filter((savings) => savings > 0.005).length;
	const worstSavings = Math.min(...passDifferences);
	const perLeg = noDen?.expectedPaidLegs ? DEN_FEE / noDen.expectedPaidLegs : 0;

	if (!central) return null;
	return (
		<div className="recommendation" aria-live="polite">
			<h2>
				{recommendation.goWild ? "Get GoWild" : "Skip GoWild"} ·{" "}
				{recommendation.discountDen ? "Get Discount Den" : "Skip Discount Den"}
			</h2>
			<p>
				In {scenarios[caseIndex].name.replace(/^\d+ · /, "")}, with the
				Mastercard {purchases.card ? "included" : "excluded"}, GoWild{" "}
				{passDelta >= 0 ? "saves" : "adds"}{" "}
				<strong>{money(Math.abs(passDelta))}</strong>. The pass saves money in{" "}
				{favorable} of {matrix.length} scenarios with Den off.
				{worstSavings < -0.005 && (
					<>
						{" "}
						It adds as much as <strong>{money(-worstSavings)}</strong> when
						fares and GoWild availability are less favorable.
					</>
				)}
			</p>
			<p>
				Discount Den {denDelta > 0 ? "saves" : "adds"}{" "}
				<strong>{money(Math.abs(denDelta))}</strong> with the recommended GoWild
				choice.{" "}
				{purchases.card && perLeg > 0 && (
					<>
						With the card already providing the pass discount, Den needs roughly{" "}
						<strong>{money(perLeg)} per paid leg</strong> to cover its fee at
						this trip mix.
					</>
				)}
			</p>
			{withPass && noPass && (
				<p>
					Expected weekend visits with GoWild are{" "}
					<strong>{fmt(withPass.successVisits)}</strong> versus{" "}
					<strong>{fmt(noPass.successVisits)}</strong> on regular tickets.
				</p>
			)}
		</div>
	);
}

export default function PurchaseComparison({
	purchases,
	gold,
	onGold,
	onPurchase,
	scenarios,
	matrix,
}: ComparisonData & {
	gold: boolean;
	onGold: (value: boolean) => void;
	onPurchase: (key: keyof Purchases, value: boolean) => void;
}) {
	const selected = purchaseIndex(purchases);
	const lowestCosts = matrix.map((row) =>
		Math.min(...row.map((result) => Math.round(result.totalCost * 100))),
	);

	return (
		<section className="purchase-panel" aria-label="Purchase decisions">
			<h2>Purchase decisions</h2>
			<div className="purchase-options">
				{choices.map(({ key, name }) => (
					<label key={key}>
						<input
							type="checkbox"
							checked={purchases[key]}
							onChange={(e) => onPurchase(key, e.target.checked)}
						/>
						<span>
							<strong>{name}</strong>
							<small>
								{key === "card"
									? money(CARD_FEE) +
										" annual fee · " +
										BONUS_MILES.toLocaleString() +
										" welcome miles"
									: key === "goWild"
										? money(passCost(purchases)) + " · annual pass"
										: money(DEN_FEE) + " · annual membership"}
							</small>
						</span>
					</label>
				))}
				<label>
					<input
						type="checkbox"
						checked={gold}
						onChange={(event) => onGold(event.target.checked)}
					/>
					<span>
						<strong>Include Elite Gold?</strong>
						<small>
							90 days guaranteed with the Mastercard offer. Spend $3,000 in the
							first 90 days to keep Gold for 12 months.
						</small>
					</span>
				</label>
			</div>
			<p className="purchase-note">
				All totals with the card include the $100 already paid. It cancels out
				when you compare GoWild and Den with the card held constant.
			</p>
			<h3>Perks and eligibility</h3>
			<div className="comparison perk-grid">
				<table>
					<thead>
						<tr>
							<th scope="col">Perk</th>
							{perkSources.map(({ key, name }) => (
								<th scope="col" key={key}>
									{name}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{perks.map((perk) => {
							const sources: readonly PerkSource[] = perk.sources;
							const active = (key: PerkSource) =>
								key === "gold" ? purchases.card && gold : purchases[key];
							const available = sources.some(active);
							const policyLabel =
								"policyLabel" in perk ? perk.policyLabel : undefined;
							return (
								<tr
									key={perk.name}
									className={available ? "perk-available" : undefined}
								>
									<th scope="row">
										<strong>
											{available || policyLabel ? (
												perk.name
											) : (
												<s>{perk.name}</s>
											)}
										</strong>
										{(available || policyLabel) && (
											<span className="perk-status">
												{policyLabel ?? "Available"}
											</span>
										)}
										<small>
											{perk.detail}{" "}
											{"url" in perk && <a href={perk.url}>Terms</a>}
										</small>
									</th>
									{perkSources.map(({ key, name }) => (
										<td key={key}>
											{sources.includes(key) ? (
												<input
													type="checkbox"
													checked={active(key)}
													disabled
													aria-label={`${perk.name} via ${name}`}
												/>
											) : (
												"—"
											)}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<h3>Projected Scenario Costs</h3>
			<p className="purchase-note">
				Scenarios defined below. Green marks the lowest expected cash cost in
				each scenario. Totals include {money(AWARD_TAXES_AND_FEES)} in estimated
				domestic taxes and fees per award leg.{" "}
				<a href="https://www.flyfrontier.com/frontiermiles/how-to-use-miles/">
					Frontier award pricing
				</a>
			</p>
			<div className="comparison purchase-matrix">
				<table>
					<thead>
						<tr>
							<th scope="col">Scenario</th>
							{PURCHASE_OPTIONS.map((option, i) => (
								<th
									key={productName(option)}
									scope="col"
									className={i === selected ? "selected-purchases" : undefined}
								>
									{productName(option)}
									{i === selected && <small>Selected</small>}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{scenarios.map((scenario, j) => (
							<tr key={scenario.id}>
								<th scope="row">
									<a href={"#card-" + scenario.id}>{scenario.name}</a>
								</th>
								{matrix[j].map((result, i) => {
									const missedWeekends = fmt(
										scenario.weekends - result.successVisits,
									);
									const difference =
										Math.round(result.totalCost * 100) - lowestCosts[j];
									const isBest = difference === 0;
									const className = [
										i === selected ? "selected-purchases" : "",
										isBest ? "best-purchase" : "",
									]
										.join(" ")
										.trim();
									return (
										<td
											key={productName(PURCHASE_OPTIONS[i])}
											className={className || undefined}
										>
											<strong>{money(result.totalCost)}</strong>
											{Number(missedWeekends) > 0 && (
												<small>
													{missedWeekends} target weekends not taken
												</small>
											)}
											{isBest ? (
												<small className="best-choice-label">Best choice</small>
											) : (
												<small className="cost-difference">
													+{money(difference / 100)} from optimal
												</small>
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}
