import AwardMileEstimator from "./AwardMileEstimator";
import { Cite, Icon, SOURCES } from "./reference";

export default function Documentation() {
	return (
		<section className="docs" id="documentation">
			<AwardMileEstimator />
			<div className="docs-heading">
				<div>
					<span className="eyebrow">DOCUMENTATION & ASSUMPTIONS</span>
					<h2>How to interpret the model</h2>
				</div>
				<Icon name="info" size={23} />
			</div>
			<div className="doc-grid">
				<div className="doc-panel">
					<h3>What counts as a saving?</h3>
					<p>
						<b>
							A booked GoWild leg saves only what you would actually have paid
							for a regular Frontier ticket.
						</b>{" "}
						The normal fare defaults are illustrative, not observed PHL–MCO
						price averages. Optional trips that fail to secure Friday are
						skipped; the model claims no fare savings for those trips. If a
						Sunday was prepaid, the forfeited portion is subtracted.
					</p>
					<p>
						The optional-trip <b>replacement %</b> lets you distinguish airfare
						truly avoided from new visits you would not have purchased.
						Subjective value of new visits can be entered separately, and never
						changes the cash-only headline.
					</p>
				</div>
				<div className="doc-panel">
					<h3>What does "success probability" mean?</h3>
					<p>
						A personal estimate for a usable <b>specific evening flight</b>, not
						a published Frontier occupancy rate. A flight can exist on the
						schedule without GoWild seats. The early-offer percentage is
						similarly unknown, and the $59–$229 fee band is <b>not</b> evidence
						that a particular $59 early fare will be offered. <Cite n={1} />
						<Cite n={2} />
					</p>
					<p>
						Try 35%, 60%, and 85% inventory assumptions, then refine them from
						your own checks over several Fridays and Sundays.
					</p>
				</div>
				<div className="doc-panel">
					<h3>Friday and Sunday are coupled</h3>
					<p>
						Optional Friday failure means no visit, not an emergency Friday
						fare. But a Sunday booked ahead can be sunk. Once you reach
						Philadelphia, a failed Saturday GoWild attempt for Sunday triggers
						the <b>last-minute return fare</b> you set. This is why Sunday
						protection is valuable and sometimes expensive.
					</p>
					<p>
						The model uses simple independent event probabilities. It does not
						simulate holiday correlations, flight cancellations, missed work,
						actual schedule changes, or airport transfers between Cape Canaveral
						and MCO.
					</p>
				</div>
				<div className="doc-panel">
					<h3>Discount Den</h3>
					<p>
						When selected, the model adds the membership cost and subtracts the
						pass discount. Enter expected Den fares in the regular and backup
						fare fields; the model does not estimate fare discounts
						automatically. This compares against those entered regular fares
						without a Den membership cost in the baseline, so it does not
						isolate GoWild versus buying Den alone. Check current prices and
						terms at{" "}
						<a
							href="https://www.flyfrontier.com/deals/discount-den/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Frontier
						</a>
						.
					</p>
				</div>
				<div className="doc-panel">
					<h3>Protecting an optional Sunday return</h3>
					<p>
						Enter the extra price of a flexible prepaid optional Sunday ticket
						separately from the ordinary Sunday fare. It applies only when the
						return is booked ahead, including an early GoWild return; it does
						not affect committed trips or last-minute returns. Set the forfeited
						percentage to the share of the entire prepaid amount, including the
						premium, that you cannot recover as cash or useful credit.
					</p>
					<p>
						Frontier says qualifying Economy fares and bundles can be canceled
						without a cancellation fee for travel credit, rather than
						necessarily a cash refund. Check the actual fare, credit conditions,
						and whether the premium is returned before booking.{" "}
						<a
							href="https://faq.flyfrontier.com/help/can-i-cancel-my-reservation"
							target="_blank"
							rel="noopener noreferrer"
						>
							Frontier cancellation policy ↗
						</a>
					</p>
				</div>
				<div className="doc-panel">
					<h3>Personal item vs carry-on vs checked bag</h3>
					<p>
						<b>Personal item: free with both regular Frontier and GoWild.</b>{" "}
						Maximum 14 × 18 × 8 inches. Carry-on: maximum 24 × 16 × 10 inches
						and 35 lb. Standard checked: maximum 62 linear inches and 40 lb.{" "}
						<Cite n={4} />
						<Cite n={5} />
					</p>
					<p>
						Carry-on and checked bag fees{" "}
						<b>vary by itinerary and purchase timing</b>. There is no reliable
						fixed nationwide fee. Enter the quoted regular-ticket amount and the
						quoted GoWild amount separately; if the prices are identical,
						baggage does <b>not</b> reduce relative GoWild savings. Use the{" "}
						<a
							href="https://www.flyfrontier.com/travel/travel-info/bag-options/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Frontier baggage page ↗
						</a>{" "}
						to check actual prices. Basic fares generally do not include
						carry-ons or checked bags; bundles or elite benefits can change
						that. <Cite n={4} />
					</p>
				</div>
			</div>
			<div className="formula">
				<h3>Core expected-value calculation</h3>
				<div className="formula-text">
					Net cash savings = savings on completed optional weekends + savings on
					committed weekends − forfeited prepaid returns − annual pass − other
					annual costs.
				</div>
				<p>
					For optional weekends, completed-trip savings are weighted by{" "}
					<b>Friday departure success</b> and by your{" "}
					<b>paid-fare replacement share</b>. A skipped optional weekend is not
					falsely treated as cash saved. Early GoWild is taken only where its
					estimated all-in price is cheaper than the ordinary advance fare. On
					late-booking failure, a committed or Sunday leg uses the specified
					last-minute backup price.
				</p>
			</div>
			<h3 className="sources-heading">
				Primary Frontier references <span>verified November 21, 2026</span>
			</h3>
			<div className="source-grid">
				{SOURCES.map((s) => (
					<a
						key={s.id}
						className="source-card"
						href={s.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<div>
							<span className="source-num">[{s.id}]</span>
							<strong>{s.short}</strong>
							<Icon name="external" size={13} />
						</div>
						<p>{s.detail}</p>
					</a>
				))}
			</div>
			<div className="footer-note">
				This is a decision model, not a live fare search or guarantee of
				inventory. The 2027 pass has no blackout dates, but published peak dates
				and extra charges still apply. Pricing, booking terms, and schedules can
				change. Check the actual fare and terms before purchasing.{" "}
				<Cite n={1} />
				<Cite n={6} />
				<Cite n={7} />
			</div>
		</section>
	);
}
