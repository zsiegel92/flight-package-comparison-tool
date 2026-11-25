import { type ReactNode, useId } from "react";
import type { Result, Scenario } from "./domain/types";
import { cash, clamp, fmt, numeric } from "./format";
import { Cite, Icon, InfoTooltip } from "./reference";

function FieldHelp({ label, help }: { label: string; help: string }) {
	return (
		<InfoTooltip text={help}>
			<button type="button" className="q" aria-label={`About ${label}`}>
				<Icon name="info" size={14} />
			</button>
		</InfoTooltip>
	);
}

function Field(p: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	unit?: string;
	min?: number;
	max?: number;
	help?: string;
	src?: number;
}) {
	const id = useId();
	return (
		<div className="field">
			<span className="field-label">
				<label htmlFor={id}>{p.label}</label>
				{p.src ? <Cite n={p.src} /> : null}
				{p.help && <FieldHelp label={p.label} help={p.help} />}
			</span>
			<span className="field-input">
				{p.unit === "$" ? <b>$</b> : null}
				<input
					id={id}
					type="number"
					value={p.value}
					step="any"
					min={p.min === undefined ? 0 : p.min}
					max={p.max}
					onChange={(e) =>
						p.onChange(
							clamp(
								numeric(e.target.value),
								p.min === undefined ? 0 : p.min,
								p.max === undefined ? 100000 : p.max,
							),
						)
					}
				/>
				{p.unit === "%" ? <em>%</em> : null}
			</span>
		</div>
	);
}
function Select(p: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: { id: string; name: string }[];
	help?: string;
	src?: number;
}) {
	const id = useId();
	return (
		<div className="field select-field">
			<span className="field-label">
				<label htmlFor={id}>{p.label}</label>
				{p.src ? <Cite n={p.src} /> : null}
				{p.help && <FieldHelp label={p.label} help={p.help} />}
			</span>
			<select
				id={id}
				value={p.value}
				onChange={(e) => p.onChange(e.target.value)}
			>
				{p.options.map((o) => (
					<option key={o.id} value={o.id}>
						{o.name}
					</option>
				))}
			</select>
		</div>
	);
}
function Section(p: {
	title: string;
	icon?: string;
	children?: ReactNode;
	open?: boolean;
	subtitle?: string;
}) {
	return (
		<details className="section" open={!!p.open}>
			<summary>
				<span className="section-heading">
					{p.icon ? <Icon name={p.icon} /> : null}
					{p.title}
				</span>
				<span className="section-subtitle">{p.subtitle}</span>
				<Icon name="down" size={15} />
			</summary>
			<div className="section-body">{p.children}</div>
		</details>
	);
}
export const OUT_OPTIONS = [
	{ id: "late", name: "Thursday GoWild → otherwise skip" },
	{ id: "early-late", name: "Try early → Thursday → skip" },
	{ id: "early", name: "Early GoWild only → otherwise skip" },
	{ id: "advance", name: "Regular Frontier in advance" },
];
export const RETURN_OPTIONS = [
	{ id: "early-advance", name: "Early GoWild → regular advance" },
	{ id: "advance", name: "Regular Frontier in advance" },
	{ id: "late-backup", name: "Saturday GoWild → last-minute backup" },
	{ id: "early-late-backup", name: "Early → Saturday → last-minute backup" },
];
export const COMMITTED_OPTIONS = [
	{ id: "early-advance", name: "Early GoWild → regular advance" },
	{ id: "advance", name: "Regular Frontier in advance" },
	{ id: "late-backup", name: "Day-before → expensive backup" },
];
export default function ScenarioCard(p: {
	s: Scenario;
	result: Result;
	index: number;
	onField: (
		id: string,
		key: keyof Scenario,
		v: Scenario[keyof Scenario],
	) => void;
	onCopy: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	const s = p.s,
		r = p.result;
	const set = (key: keyof Scenario) => (v: Scenario[keyof Scenario]) =>
		p.onField(s.id, key, v);
	const fld = (
		key: keyof Scenario,
		label: string,
		unit?: string,
		help?: string,
		src?: number,
		max?: number,
	) => (
		<Field
			label={label}
			value={numeric(s[key])}
			onChange={set(key)}
			unit={unit}
			help={help}
			src={src}
			max={max}
		/>
	);
	return (
		<article className="scenario-card" id={"card-" + s.id}>
			<div className="card-header">
				<div className="card-overline">
					<span className="scenario-label">
						SCENARIO {String(p.index + 1).padStart(2, "0")}
					</span>
					<div className="icon-actions">
						<InfoTooltip text="Duplicate this scenario">
							<button
								type="button"
								aria-label="Duplicate scenario"
								onClick={() => p.onCopy(s.id)}
							>
								<Icon name="copy" />
							</button>
						</InfoTooltip>
						<InfoTooltip text="Delete scenario">
							<button
								type="button"
								aria-label="Delete scenario"
								onClick={() => p.onDelete(s.id)}
							>
								<Icon name="trash" />
							</button>
						</InfoTooltip>
					</div>
				</div>
				<input
					className="scenario-title"
					aria-label="Scenario name"
					value={s.name}
					onChange={(e) => set("name")(e.target.value)}
				/>
				<label className="rationale-label" htmlFor={"why-" + s.id}>
					Rationale · editable
				</label>
				<textarea
					id={"why-" + s.id}
					className="rationale"
					rows={3}
					value={s.rationale}
					onChange={(e) => set("rationale")(e.target.value)}
				/>
			</div>
			<div className="result">
				<div>
					<span className="eyebrow">Expected total cash cost</span>
					<div className="result-number">{cash(r.totalCost)}</div>
				</div>
			</div>
			<div className="stats-grid">
				<div>
					<span>Expected visits</span>
					<strong>{fmt(r.successVisits)}</strong>
					<small>of {s.weekends} planned</small>
				</div>
				<div>
					<span>GoWild flights</span>
					<strong>{fmt(r.expectedGwLegs)}</strong>
					<small>of {s.weekends * 2} legs</small>
				</div>
				<div>
					<span>Skipped options</span>
					<strong>{fmt(r.skippedVisits)}</strong>
					<small>no forced Friday backup</small>
				</div>
			</div>
			<div className="card-settings">
				<Section
					title="Trip mix & booking policy"
					icon="calendar"
					open
					subtitle="Friday vs Sunday are modeled separately"
				>
					<div className="field-grid">
						{fld(
							"weekends",
							"Total intended round trips / year",
							undefined,
							"Count 1 Orlando→Philly Friday and 1 Philly→Orlando Sunday per trip.",
							undefined,
							100,
						)}
						{fld(
							"optionalWeekends",
							"Optional, skippable weekends",
							undefined,
							"Out of total intended weekends; the rest are committed.",
							undefined,
							s.weekends,
						)}
						{fld(
							"replacePct",
							"Optional trips replacing paid travel",
							"%",
							"If 100%, each successful optional visit replaces a Frontier round trip you otherwise would have bought. If 0%, visits are new and not cash savings.",
							undefined,
							100,
						)}
					</div>
					<div className="mini-heading">
						OPTIONAL WEEKENDS ({r.optionalCount})
					</div>
					<Select
						label="Friday · MCO → PHL"
						value={s.optionalOut}
						onChange={set("optionalOut")}
						options={OUT_OPTIONS}
						src={1}
					/>
					<Select
						label="Sunday · PHL → MCO"
						value={s.optionalReturn}
						onChange={set("optionalReturn")}
						options={RETURN_OPTIONS}
						help="Unlike Friday, missing a Sunday seat after you arrive means a mandatory backup, not a skipped trip."
					/>
					<div className="mini-heading">
						COMMITTED WEEKENDS ({r.committedCount})
					</div>
					<Select
						label="Friday · MCO → PHL"
						value={s.committedOut}
						onChange={set("committedOut")}
						options={COMMITTED_OPTIONS}
					/>
					<Select
						label="Sunday · PHL → MCO"
						value={s.committedReturn}
						onChange={set("committedReturn")}
						options={COMMITTED_OPTIONS}
					/>
				</Section>
				<Section
					title="Fares & fees"
					icon="chart"
					open
					subtitle="All prices are per one-way flight"
				>
					<div className="field-grid">
						{fld("christmasFare", "Christmas 2026 regular round trip", "$")}
						{fld(
							"christmasGoWildQuote",
							"Christmas GoWild round-trip quote",
							"$",
							"Enter the quoted price for both Christmas flights if GoWild seats are available. Include taxes, early booking and peak charges, and any bags. Leave at $0 to model a regular cash booking.",
						)}
						{fld(
							"denSavingPerLeg",
							"Average Discount Den saving per paid leg",
							"$",
							"Compare the public and member fares for your dates. Average across all booked legs, including those without a discount.",
						)}
						{fld("awardMilesPerFlight", "Miles per award flight")}
						{fld("ancillaryAwardMiles", "Bonus miles reserved for extras")}
						{fld(
							"ancillaryAwardValue",
							"Eligible weekend extras offset by those miles",
							"$",
							"Use a confirmed award quote for extras already included in the weekend budget.",
						)}
						{fld(
							"fareFri",
							"Normal Friday fare",
							"$",
							"Actual fare you would have bought in advance, including regular ticket taxes.",
							undefined,
							2000,
						)}
						{fld(
							"fareSun",
							"Normal Sunday fare",
							"$",
							"Actual fare you would have bought in advance, including regular ticket taxes.",
							undefined,
							2000,
						)}
						{fld(
							"lateFareFri",
							"Emergency Friday fare",
							"$",
							"Last-minute fallback after an unavailable committed Friday GoWild seat.",
							undefined,
							2000,
						)}
						{fld(
							"lateFareSun",
							"Emergency Sunday fare",
							"$",
							"Last-minute backup to get back to work Monday.",
							undefined,
							2000,
						)}
						{fld(
							"gwTaxes",
							"GoWild ticket + taxes / leg",
							"$",
							"Approximately $14.90+ domestic taxes and fees plus $0.01 airfare.",
							3,
							300,
						)}
						{fld(
							"earlyFeeFri",
							"Friday early-booking fee",
							"$",
							"Illustrative checkout charge; varies. Only used when early offer is economical.",
							2,
							500,
						)}
						{fld(
							"earlyFeeSun",
							"Sunday early-booking fee",
							"$",
							"Illustrative checkout charge; varies. Only used when early offer is economical.",
							2,
							500,
						)}
					</div>
					<Select
						label="When early-booking and peak-day charges coincide"
						value={s.feeStack}
						onChange={set("feeStack")}
						options={[
							{ id: "sum", name: "Add both (conservative)" },
							{ id: "max", name: "Use the greater charge" },
						]}
						help="Frontier shows the applicable checkout charge(s). Do not assume one cancels the other; the sum option is more cautious."
						src={2}
					/>
				</Section>
				<Section
					title="Seat odds & peak dates"
					icon="plane"
					subtitle="Estimated evening-flight probabilities, not published statistics"
				>
					<p className="section-intro">
						Set these to your beliefs for the{" "}
						<b>specific Friday-evening and Sunday-evening flights</b>, not all
						flights operating on those days. Availability is never guaranteed.{" "}
						<Cite n={1} />
					</p>
					<div className="field-grid">
						{fld(
							"lateSuccessFri",
							"Friday day-before success",
							"%",
							"Probability of an available, usable Thursday GoWild fare.",
							undefined,
							100,
						)}
						{fld(
							"lateSuccessSun",
							"Sunday day-before success",
							"%",
							"Probability of an available, usable Saturday GoWild fare.",
							undefined,
							100,
						)}
						{fld(
							"earlyOfferFri",
							"Friday early offer available",
							"%",
							"Probability that an early GoWild option is available at your assumed fee; economic selection is still checked.",
							undefined,
							100,
						)}
						{fld(
							"earlyOfferSun",
							"Sunday early offer available",
							"%",
							"Probability of an early eligible GoWild fare.",
							undefined,
							100,
						)}
						{fld(
							"peakShareFri",
							"Friday flights on peak dates",
							"%",
							"Estimated share of your selected Friday departures in Frontier’s peak-day calendar.",
							6,
							100,
						)}
						{fld(
							"peakShareSun",
							"Sunday flights on peak dates",
							"%",
							"Estimated share of your selected Sunday departures on peak dates.",
							6,
							100,
						)}
						{fld(
							"peakChargeFri",
							"Friday peak-day charge",
							"$",
							"Charge per peak Friday leg if GoWild is used.",
							2,
							500,
						)}
						{fld(
							"peakChargeSun",
							"Sunday peak-day charge",
							"$",
							"Charge per peak Sunday leg if GoWild is used.",
							2,
							500,
						)}
					</div>
				</Section>
				<Section
					title="Baggage, sunk tickets & extras"
					icon="shield"
					subtitle="Compares GoWild to a regular Frontier fare"
				>
					<p className="section-intro">
						Both standard Frontier fares and GoWild include one free personal
						item. The amounts below represent{" "}
						<b>each side's actual expected bag costs</b>, so only the difference
						affects a GoWild saving. <Cite n={4} />
					</p>
					<div className="field-grid">
						{fld(
							"carryShare",
							"Flights with a carry-on",
							"%",
							"Share of legs where you would pay for a carry-on under both fare types.",
							undefined,
							100,
						)}
						{fld(
							"checkedShare",
							"Flights with a checked bag",
							"%",
							"Share of legs where you would check one bag.",
							undefined,
							100,
						)}
						{fld(
							"regularCarry",
							"Regular Frontier carry-on",
							"$",
							"Illustrative advance-purchase price per leg; check the actual itinerary.",
							4,
							400,
						)}
						{fld(
							"gwCarry",
							"GoWild carry-on",
							"$",
							"Illustrative price per GoWild leg; may be higher closer to departure.",
							4,
							400,
						)}
						{fld(
							"regularChecked",
							"Regular Frontier checked bag",
							"$",
							"Illustrative standard 40 lb checked bag, per leg.",
							4,
							400,
						)}
						{fld(
							"gwChecked",
							"GoWild checked bag",
							"$",
							"Illustrative GoWild checked bag, per leg.",
							4,
							400,
						)}
						{fld(
							"seatExtra",
							"Extra seat/other cost on GoWild",
							"$",
							"Only differential versus the regular Frontier fare; use 0 if you accept a random seat on either ticket.",
							undefined,
							400,
						)}
						{fld(
							"annualFriction",
							"Other annual pass-related cost",
							"$",
							"Optional miscellaneous costs, e.g. additional planning overhead you choose to monetize.",
							undefined,
							2000,
						)}
						{fld(
							"optionalReturnFlexPremium",
							"Optional Sunday flexibility premium",
							"$",
							"Extra per prepaid optional return for a refundable or credit-eligible fare.",
							undefined,
							2000,
						)}
						{fld(
							"sunkReturnPct",
							"Prepaid return forfeited on Friday failure",
							"%",
							"If Friday fails and you skip, percentage of a previously purchased Sunday ticket you cannot recover as a refund or useful credit.",
							undefined,
							100,
						)}
						{fld(
							"incrementalVisitValue",
							"Value of new optional visit",
							"$",
							"Subjective non-cash value if the pass creates an additional visit you would not otherwise buy. Shown separately from cash savings.",
							undefined,
							5000,
						)}
					</div>
					<div className="inline-note">
						<Icon name="info" /> Personal item: 14 × 18 × 8 in free on{" "}
						<b>both</b> fares. Carry-on: 24 × 16 × 10 in, ≤35 lb. Standard
						checked bag: ≤62 linear in and ≤40 lb. <Cite n={5} />
					</div>
				</Section>
				<Section
					title="Calculation audit"
					icon="chart"
					subtitle="Inspect exactly where the value comes from"
				>
					<div className="audit">
						<div>
							<span>Card, memberships and annual costs</span>
							<strong>{cash(r.fixedCost)}</strong>
						</div>
						<div>
							<span>Christmas round trip</span>
							<strong>{cash(r.christmasCost)}</strong>
						</div>
						<div>
							<span>Weekend tickets and extras before awards</span>
							<strong>{cash(r.weekendCost)}</strong>
						</div>
						<div>
							<span>Forfeited prepaid returns (included above)</span>
							<strong>{cash(r.sunkExposure)}</strong>
						</div>
						<div>
							<span>Expected last-minute Sunday backups on optional trips</span>
							<strong>{fmt(r.optionalSundayBackups)}</strong>
						</div>
						<div>
							<span>Expected flights booked with miles</span>
							<strong>{fmt(r.awardFlights)}</strong>
						</div>
						<div>
							<span>Cash savings from flight and extras awards</span>
							<strong>{cash(r.awardSavings + r.ancillarySavings)}</strong>
						</div>
						<div>
							<span>Miles earned from modeled purchases</span>
							<strong>{Math.round(r.milesEarned).toLocaleString()}</strong>
						</div>
						<div>
							<span>Unused miles at end of scenario</span>
							<strong>{Math.round(r.remainingMiles).toLocaleString()}</strong>
						</div>
						<div className="audit-total">
							<span>Expected total cash cost</span>
							<strong>{cash(r.totalCost)}</strong>
						</div>
						{r.extraVisitValue > 0 && (
							<div>
								<span>Subjective value of additional visits</span>
								<strong>{cash(r.extraVisitValue)}</strong>
							</div>
						)}
					</div>
					<p className="section-intro">
						Optional Friday success ={" "}
						<b>{(r.optionalOut.probability * 100).toFixed(0)}%</b>.{" "}
						{r.optionalOut.detail}. Optional Sunday: {r.optionalReturn.note}.
					</p>
					<p className="section-intro">
						Every used GoWild fare is compared against the{" "}
						<b>ordinary Frontier fare plus ordinary Frontier baggage</b>. Early
						GoWild is rejected when its average all-in cost is not cheaper; this
						model uses expected peak fees, rather than individual dates.
					</p>
				</Section>
			</div>
		</article>
	);
}
