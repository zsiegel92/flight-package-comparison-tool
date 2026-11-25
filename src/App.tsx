import { type ChangeEvent, Component } from "react";
import Documentation from "./Documentation";
import { calculateScenario } from "./domain/calculation";
import { BASE, SEEDS } from "./domain/presets";
import {
	DEFAULT_PURCHASES,
	PURCHASE_OPTIONS,
	type Purchases,
} from "./domain/purchases";
import type { Scenario } from "./domain/types";
import { clamp, numeric } from "./format";
import PurchaseComparison, {
	purchaseIndex,
	Recommendation,
} from "./PurchaseComparison";
import { Icon, SOURCES } from "./reference";
import ScenarioCard, {
	COMMITTED_OPTIONS,
	OUT_OPTIONS,
	RETURN_OPTIONS,
} from "./ScenarioCard";

function saveFile(filename: string, text: string) {
	const blob = new Blob([text], { type: "application/json" });
	const u = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = u;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(u), 500);
}
function uid() {
	return "sc-" + Math.random().toString(36).slice(2, 11);
}
function sanitize(data: unknown): Scenario {
	const values: Record<string, Scenario[keyof Scenario]> = { ...BASE };
	if (data && typeof data === "object") {
		const input = data as Record<string, unknown>;
		for (const [key, fallback] of Object.entries(BASE)) {
			if (!Object.hasOwn(input, key)) continue;
			const value = input[key];
			if (typeof fallback === "number") {
				const max = /pct|share|success|offer/i.test(key) ? 100 : 100000;
				values[key] = clamp(numeric(value, fallback), 0, max);
			} else if (typeof value === "string") {
				values[key] = value.slice(0, key === "rationale" ? 1500 : 120);
			}
		}
	}
	const scenario = values as unknown as Scenario;
	scenario.weekends = Math.round(scenario.weekends);
	scenario.optionalWeekends = clamp(
		Math.round(scenario.optionalWeekends),
		0,
		scenario.weekends,
	);
	if (!OUT_OPTIONS.some(({ id }) => id === scenario.optionalOut))
		scenario.optionalOut = BASE.optionalOut;
	if (!RETURN_OPTIONS.some(({ id }) => id === scenario.optionalReturn))
		scenario.optionalReturn = BASE.optionalReturn;
	if (!COMMITTED_OPTIONS.some(({ id }) => id === scenario.committedOut))
		scenario.committedOut = BASE.committedOut;
	if (!COMMITTED_OPTIONS.some(({ id }) => id === scenario.committedReturn))
		scenario.committedReturn = BASE.committedReturn;
	if (scenario.feeStack !== "max") scenario.feeStack = "sum";
	if (
		!scenario.id ||
		!data ||
		typeof data !== "object" ||
		!Object.hasOwn(data, "id")
	)
		scenario.id = uid();
	return scenario;
}
function readInitial(): Scenario[] {
	try {
		const raw = JSON.parse(localStorage.getItem("gowild-studio-v1") || "null");
		if (Array.isArray(raw) && raw.length <= 500) return raw.map(sanitize);
	} catch {}
	return SEEDS.map(sanitize);
}
interface AppState {
	scenarios: Scenario[];
	purchases: Purchases;
	gold: boolean;
}

function readPurchaseSettings(): Pick<AppState, "purchases" | "gold"> {
	try {
		const settings = JSON.parse(
			localStorage.getItem("frontier-purchases-v1") || "null",
		);
		if (
			settings &&
			typeof settings.purchases?.card === "boolean" &&
			typeof settings.purchases.goWild === "boolean" &&
			typeof settings.purchases.discountDen === "boolean"
		)
			return {
				purchases: settings.purchases,
				gold: settings.gold === true,
			};
	} catch {}
	return { purchases: DEFAULT_PURCHASES, gold: false };
}

export default class App extends Component<Record<string, never>, AppState> {
	state: AppState = { scenarios: readInitial(), ...readPurchaseSettings() };
	upload: HTMLInputElement | null = null;

	componentDidMount() {
		document.addEventListener("toggle", syncAssumptionSections, true);
	}

	componentWillUnmount() {
		document.removeEventListener("toggle", syncAssumptionSections, true);
	}

	componentDidUpdate(
		_: Readonly<Record<string, never>>,
		prev: Readonly<AppState>,
	) {
		const { purchases, gold } = this.state;
		if (purchases !== prev.purchases || gold !== prev.gold) {
			try {
				localStorage.setItem(
					"frontier-purchases-v1",
					JSON.stringify({ purchases, gold }),
				);
			} catch {}
		}
		if (this.state.scenarios !== prev.scenarios) {
			try {
				localStorage.setItem(
					"gowild-studio-v1",
					JSON.stringify(this.state.scenarios),
				);
			} catch {}
		}
	}
	update = (id: string, key: keyof Scenario, v: Scenario[keyof Scenario]) =>
		this.setState((x) => ({
			scenarios: x.scenarios.map((s: Scenario) => {
				if (s.id !== id) return s;
				const out: Scenario = { ...s, [key]: v };
				if (key === "weekends") {
					out.weekends = Math.round(out[key]);
					out.optionalWeekends = Math.min(out.optionalWeekends, out.weekends);
				}
				if (key === "optionalWeekends")
					out.optionalWeekends = Math.min(out.weekends, Math.round(out[key]));
				return out;
			}),
		}));
	duplicate = (id: string) =>
		this.setState((x) => ({
			scenarios: x.scenarios.flatMap((s: Scenario) =>
				s.id === id
					? [
							s,
							{
								...s,
								id: uid(),
								name: s.name.replace(/^\d+ · /, "") + " · copy",
							},
						]
					: [s],
			),
		}));
	remove = (id: string) =>
		this.setState((x) => ({
			scenarios: x.scenarios.filter((s: Scenario) => s.id !== id),
		}));
	add = () =>
		this.setState((x) => ({
			scenarios: [
				...x.scenarios,
				{
					...BASE,
					id: uid(),
					name: "New scenario",
					rationale: "Describe which assumptions this scenario tests and why.",
				},
			],
		}));
	restore = () => {
		if (
			confirm("Replace all current scenarios with the five example scenarios?")
		)
			this.setState({ scenarios: SEEDS.map(sanitize) });
	};
	export = () =>
		saveFile(
			"gowild-scenarios.json",
			JSON.stringify(
				{
					app: "GoWild Decision Studio",
					created: new Date().toISOString(),
					scenarios: this.state.scenarios,
				},
				null,
				2,
			),
		);
	import = (e: ChangeEvent<HTMLInputElement>) => {
		const input = e.currentTarget;
		const f = input.files?.[0];
		if (!f) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(String(reader.result));
				const arr = Array.isArray(data) ? data : data.scenarios;
				if (!Array.isArray(arr) || arr.length > 500)
					throw Error("Invalid scenario list");
				const ids = new Set<string>();
				const scenarios = arr.map((data: unknown) => {
					const scenario = sanitize(data);
					while (ids.has(scenario.id)) scenario.id = uid();
					ids.add(scenario.id);
					return scenario;
				});
				this.setState({ scenarios });
			} catch {
				alert("Could not import a valid scenarios JSON file.");
			}
			input.value = "";
		};
		reader.readAsText(f);
	};
	render() {
		const { scenarios, purchases, gold } = this.state;
		const matrix = scenarios.map((s) =>
			PURCHASE_OPTIONS.map((choice) => calculateScenario(s, choice, gold)),
		);
		const selected = purchaseIndex(purchases);
		return (
			<main className="shell">
				<header className="topline">
					<div className="brand">
						<span className="brand-icon">
							<Icon name="plane" size={17} />
						</span>
						<span>
							GoWild <span className="brand-light">Decision Studio</span>
						</span>
					</div>
					<div className="top-right">
						<a href={SOURCES[0].url} target="_blank" rel="noopener noreferrer">
							Frontier official terms <Icon name="external" size={13} />
						</a>
					</div>
				</header>
				<section className="hero">
					<div className="eyebrow hero-kicker">
						ORLANDO ⇄ PHILADELPHIA · FRIDAY / SUNDAY
					</div>
					<h1>
						Which Frontier purchases <span>pay off?</span>
					</h1>
					<p>
						Compare GoWild, Discount Den and the Mastercard using your expected
						Orlando–Philadelphia weekends and Christmas trip.
					</p>
				</section>
				<Recommendation
					purchases={purchases}
					scenarios={scenarios}
					matrix={matrix}
				/>
				<PurchaseComparison
					purchases={purchases}
					gold={gold}
					onGold={(value) => this.setState({ gold: value })}
					onPurchase={(key, value) =>
						this.setState((state) => ({
							purchases: { ...state.purchases, [key]: value },
						}))
					}
					scenarios={scenarios}
					matrix={matrix}
				/>
				<div className="controls">
					<div>
						<h2>Trip scenarios</h2>
						<p>
							Edit the trip, fare and booking assumptions behind each
							comparison.
						</p>
					</div>
					<div className="buttonbar">
						<button type="button" className="btn primary" onClick={this.add}>
							<Icon name="plus" /> New scenario
						</button>
						<button type="button" className="btn" onClick={this.export}>
							<Icon name="download" /> Export JSON
						</button>
						<button
							type="button"
							className="btn"
							onClick={() => this.upload?.click()}
						>
							<Icon name="upload" /> Import
						</button>
						<button type="button" className="btn" onClick={this.restore}>
							<Icon name="reset" /> Reset scenarios to default
						</button>
						<input
							type="file"
							accept="application/json,.json"
							ref={(x) => {
								this.upload = x;
							}}
							onChange={this.import}
							style={{ display: "none" }}
						/>
					</div>
				</div>
				<div className="scenario-grid">
					{scenarios.map((s, i) => (
						<ScenarioCard
							key={s.id}
							s={s}
							result={matrix[i][selected]}
							index={i}
							onField={this.update}
							onCopy={this.duplicate}
							onDelete={this.remove}
						/>
					))}
				</div>
				<div className="end-add">
					<button type="button" className="btn" onClick={this.add}>
						<Icon name="plus" /> Add another scenario
					</button>
				</div>
				<Documentation />
				<footer>
					GoWild Decision Studio · Changes saved locally in your browser, with
					JSON export/import
				</footer>
			</main>
		);
	}
}

// Keep the same assumption group open across scenario columns for comparison.
function syncAssumptionSections(event: Event) {
	const section = event.target;
	if (
		!(section instanceof HTMLDetailsElement) ||
		!section.classList.contains("section")
	)
		return;
	const settings = section.parentElement;
	if (!settings?.classList.contains("card-settings")) return;
	const index = Array.from(settings.children).indexOf(section);
	document.querySelectorAll(".card-settings").forEach((other) => {
		const peer = other.children[index];
		if (peer instanceof HTMLDetailsElement && peer.open !== section.open)
			peer.open = section.open;
	});
}
