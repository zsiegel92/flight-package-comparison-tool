import { useState } from "react";

const fields = [
	{ key: "mcoMiles", label: "MCO → PHL award miles", min: 1, initial: "5000" },
	{ key: "phlMiles", label: "PHL → MCO award miles", min: 1, initial: "5000" },
	{ key: "mcoCash", label: "MCO → PHL cash fare ($)", min: 0, initial: "140" },
	{ key: "phlCash", label: "PHL → MCO cash fare ($)", min: 0, initial: "165" },
	{
		key: "mcoFees",
		label: "MCO → PHL award taxes and fees ($)",
		min: 0,
		initial: "5.60",
	},
	{
		key: "phlFees",
		label: "PHL → MCO award taxes and fees ($)",
		min: 0,
		initial: "5.60",
	},
];

function mileValue(cash: string, fees: string, miles: string) {
	const awardMiles = Number(miles);
	if (awardMiles <= 0) return "enter miles greater than zero";
	return (
		(((Number(cash) - Number(fees)) * 100) / awardMiles).toFixed(2) +
		"¢ per mile"
	);
}

export default function AwardMileEstimator() {
	const [quotes, setQuotes] = useState(() =>
		Object.fromEntries(fields.map(({ key, initial }) => [key, initial])),
	);

	return (
		<section className="formula" aria-label="Award mile value estimator">
			<h3>Value your Frontier miles</h3>
			<p>
				Frontier advertises domestic awards starting at 5,000 miles one way.
				Enter actual quotes for the flights and dates you would book. Award
				taxes, fees and any redemption fee remain payable.{" "}
				<a
					href="https://www.flyfrontier.com/frontiermiles/how-to-use-miles/"
					target="_blank"
					rel="noopener noreferrer"
				>
					Frontier award information ↗
				</a>
			</p>
			<div className="field-grid" style={{ maxWidth: 800 }}>
				{fields.map(({ key, label, min }) => (
					<label className="field" key={key}>
						<span className="field-label">{label}</span>
						<span className="field-input">
							<input
								type="number"
								min={min}
								step={min === 1 ? 1 : "any"}
								value={quotes[key]}
								onChange={(event) => {
									const value = event.currentTarget.value;
									setQuotes((previous) => ({ ...previous, [key]: value }));
								}}
							/>
						</span>
					</label>
				))}
			</div>
			<p style={{ marginTop: 16 }} aria-live="polite">
				MCO → PHL: {mileValue(quotes.mcoCash, quotes.mcoFees, quotes.mcoMiles)}{" "}
				· PHL → MCO:{" "}
				{mileValue(quotes.phlCash, quotes.phlFees, quotes.phlMiles)}
			</p>
			<p>
				Value = (cash fare you would otherwise pay − award cash charges) ÷
				miles. Enter a representative cents-per-mile value in each scenario’s
				card settings. Compare equivalent tickets and account for rewards
				forgone on the cash fare if material. Examples are illustrative, not
				live prices.
			</p>
		</section>
	);
}
