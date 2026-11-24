import { type ChangeEvent, Component } from "react";
import Documentation from "./Documentation";
import { calculateScenario } from "./domain/calculation";
import { BASE, SEEDS } from "./domain/presets";
import type { Scenario } from "./domain/types";
import { clamp, fmt, numeric, signed } from "./format";
import { Cite, Icon, SOURCES } from "./reference";
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
			} else if (
				(typeof fallback === "boolean" && typeof value === "boolean") ||
				typeof value === "string"
			) {
				values[key] =
					typeof value === "string"
						? value.slice(0, key === "rationale" ? 1500 : 120)
						: value;
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
	if (!scenario.id) scenario.id = uid();
	return scenario;
}
function readInitial(): Scenario[] {
	try {
		const raw = JSON.parse(localStorage.getItem("gowild-studio-v1") || "null");
		if (Array.isArray(raw) && raw.length > 0 && raw.length <= 500)
			return raw.map(sanitize);
	} catch {}
	return SEEDS.map(sanitize);
}
interface AppState {
	scenarios: Scenario[];
}

export default class App extends Component<Record<string, never>, AppState> {
	state: AppState = { scenarios: readInitial() };
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
				this.setState({
					scenarios: arr.map((d: unknown) => ({ ...sanitize(d), id: uid() })),
				});
			} catch {
				alert("Could not import a valid scenarios JSON file.");
			}
			input.value = "";
		};
		reader.readAsText(f);
	};
	render() {
		const scenarios = this.state.scenarios,
			results = scenarios.map(calculateScenario),
			positive = results.filter((r) => r.netCash + r.pointsValue >= 0).length;
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
						Does the $399 GoWild pass
						<br />
						<span>actually pay for itself?</span>
					</h1>
					<p>
						Compare unlimited scenarios for a recurring commute to see your
						wife. Model optional weekends you can skip, protected Sunday
						returns, early-booking charges, seat availability, peak-day
						surcharges, and{" "}
						<em>real savings versus ordinary Frontier tickets</em>.
					</p>
					<div className="hero-chip-row">
						<span>
							<Icon name="shield" size={15} /> No forced backup fare for skipped
							optional Fridays
						</span>
						<span>
							<Icon name="chart" size={15} /> Direction-specific economics
						</span>
						<span>
							<Icon name="calendar" size={15} /> Five editable starting cases
						</span>
					</div>
				</section>
				<div className="metrics">
					<div className="metric">
						<span>Scenarios in your workspace</span>
						<strong>{scenarios.length}</strong>
					</div>
					<div className="metric">
						<span>Expected positive returns</span>
						<strong>
							{positive} <small>/ {scenarios.length}</small>
						</strong>
					</div>
					<div className="metric">
						<span>
							Published pass offer <Cite n={1} />
						</span>
						<strong>$399</strong>
					</div>
					<div className="metric">
						<span>
							Normal domestic GoWild window <Cite n={1} />
						</span>
						<strong>Day before</strong>
					</div>
				</div>
				<div className="controls">
					<div>
						<h2>Scenario comparison</h2>
						<p>
							Click a scenario name to edit its complete set of assumptions.
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
							<Icon name="reset" /> Reset examples
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
				<div className="comparison">
					<table>
						<thead>
							<tr>
								<th>Scenario</th>
								<th>Visits planned</th>
								<th>Optional / committed</th>
								<th>Expected completed</th>
								<th>GoWild legs</th>
								<th>Before pass</th>
								<th>First-year cash + miles</th>
							</tr>
						</thead>
						<tbody>
							{scenarios.map((s, i) => {
								const r = results[i];
								return (
									<tr key={s.id}>
										<td>
											<a href={"#card-" + s.id}>
												{s.name} <Icon name="chevron" size={13} />
											</a>
										</td>
										<td>{s.weekends}</td>
										<td>
											{r.optionalCount} / {r.committedCount}
										</td>
										<td>{fmt(r.successVisits)}</td>
										<td>{fmt(r.expectedGwLegs)}</td>
										<td className={r.grossCash >= 0 ? "positive" : "negative"}>
											{signed(r.grossCash)}
										</td>
										<td>
											<b
												className={
													r.netCash + r.pointsValue >= 0
														? "positive"
														: "negative"
												}
											>
												{signed(r.netCash + r.pointsValue)}
											</b>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
					{scenarios.length === 0 ? (
						<div className="empty">
							No scenarios yet. Add one or reset to the five examples.
						</div>
					) : null}
				</div>
				<div className="section-head">
					<div>
						<h2>Explore each scenario</h2>
						<p>
							All fields, assumptions, rationales, and results update
							immediately. Cards are independent and can be duplicated without
							limit.
						</p>
					</div>
				</div>
				<div className="scenario-grid">
					{scenarios.map((s, i) => (
						<ScenarioCard
							key={s.id}
							s={s}
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
