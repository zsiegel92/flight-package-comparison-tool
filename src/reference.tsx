import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const SOURCES = [
	{
		id: 1,
		short: "2027 GoWild conditions",
		title: "Frontier 2027 GoWild pass",
		url: "https://www.flyfrontier.com/deals/gowild-pass/?mobile=true",
		detail:
			"$399 introductory pass; eligible travel through Dec 31, 2027; domestic day-before booking; select early-booking offers; no blackout dates but peak charges; limited seats; automatic renewal.",
	},
	{
		id: 2,
		short: "Early / peak fee range",
		title: "Frontier optional services",
		url: "https://www.flyfrontier.com/optional-services",
		detail:
			"Frontier currently lists a GoWild early-booking charge / peak-day charge of $59–$229 per passenger, per segment. The charge shown at checkout controls. This is not a guaranteed quote.",
	},
	{
		id: 3,
		short: "Taxes and fare",
		title: "Frontier GoWild taxes FAQ",
		url: "https://faq.flyfrontier.com/help/how-much-do-taxes-fees-and-charges-cost-per-flight",
		detail:
			"GoWild airfare is $0.01 per segment plus government and airport-imposed taxes and fees, with domestic taxes/fees starting around $14.90. They depend on the itinerary.",
	},
	{
		id: 4,
		short: "Baggage pricing",
		title: "Frontier bag-pricing FAQ",
		url: "https://faq.flyfrontier.com/help/bags-seats-general-info-how-much-does-frontier-charge-for-bags",
		detail:
			"Every Frontier ticket includes one personal item. Carry-on and checked-bag prices vary by travel date, booking time and bundle. Use Frontier’s bag price checker for actual quotes.",
	},
	{
		id: 5,
		short: "Baggage sizes",
		title: "Frontier baggage size limits",
		url: "https://faq.flyfrontier.com/help/bags-seats-general-info-what-are-the-sizes-and-weight-limits-for-bags",
		detail:
			"Personal item: 14 × 18 × 8 in; carry-on: 24 × 16 × 10 in, at most 35 lb; standard checked bag: at most 62 linear inches and 40 lb.",
	},
	{
		id: 6,
		short: "Peak dates / seat inventory",
		title: "Frontier 2027 peak-day schedule",
		url: "https://www.flyfrontier.com/deals/gowild-pass/?mobile=true",
		detail:
			"Frontier publishes a specific 2027 peak-day calendar. Peak days are not blackout dates; GoWild seat inventory is still capacity-controlled and not guaranteed.",
	},
	{
		id: 7,
		short: "Program terms / renewal",
		title: "Frontier Miles GoWild terms",
		url: "https://www.flyfrontier.com/frontiermiles/terms-and-conditions",
		detail:
			"GoWild passes automatically renew unless canceled within the applicable deadline; initial purchases are generally nonrefundable. Confirm the exact renewal details for your offer.",
	},
];
export function Icon(p: { name: string; size?: number }) {
	const map: Record<string, ReactNode> = {
		plus: <path d="M12 5v14M5 12h14" />,
		copy: (
			<g>
				<rect x="8" y="8" width="12" height="12" rx="2" />
				<path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
			</g>
		),
		trash: (
			<g>
				<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
				<path d="M10 10v6M14 10v6" />
			</g>
		),
		external: (
			<g>
				<path d="M14 4h6v6M20 4l-9 9" />
				<path d="M20 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />
			</g>
		),
		down: <path d="m7 10 5 5 5-5" />,
		download: (
			<g>
				<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" />
			</g>
		),
		upload: (
			<g>
				<path d="M12 21V9m-5 5 5-5 5 5M5 7V3h14v4" />
			</g>
		),
		reset: (
			<g>
				<path d="M3 11a9 9 0 0 1 15-6l3 3" />
				<path d="M21 3v5h-5M21 13a9 9 0 0 1-15 6l-3-3M3 21v-5h5" />
			</g>
		),
		info: (
			<g>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 11v5M12 8h.01" />
			</g>
		),
		plane: <path d="M22 2 9.5 14.5M22 2l-5 20-5-9-9-5 19-6Z" />,
		shield: (
			<g>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
				<path d="m9 12 2 2 4-4" />
			</g>
		),
		chart: (
			<g>
				<path d="M3 3v18h18" />
				<path d="m7 16 5-6 4 3 4-7" />
			</g>
		),
		chevron: <path d="m9 18 6-6-6-6" />,
		calendar: (
			<g>
				<rect x="3" y="5" width="18" height="16" rx="2" />
				<path d="M7 3v4M17 3v4M3 10h18" />
			</g>
		),
	};
	return (
		<svg
			width={p.size || 16}
			height={p.size || 16}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.75"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{map[p.name] || map.info}
		</svg>
	);
}
export function InfoTooltip({
	text,
	children,
}: {
	text: string;
	children: ReactNode;
}) {
	return (
		<Tooltip.Root>
			<Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content
					className="info-tooltip"
					sideOffset={6}
					collisionPadding={12}
				>
					{text}
					<Tooltip.Arrow className="info-tooltip-arrow" />
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
}

export function Cite(p: { n: number; tip?: string }) {
	const s = SOURCES[p.n - 1];
	return (
		<InfoTooltip text={p.tip || s.title}>
			<a
				href={s.url}
				target="_blank"
				rel="noopener noreferrer"
				className="cite"
				aria-label={s.title}
			>
				[{p.n}]
			</a>
		</InfoTooltip>
	);
}
