export interface Purchases {
	card: boolean;
	goWild: boolean;
	discountDen: boolean;
}

export const DEFAULT_PURCHASES: Purchases = {
	card: true,
	goWild: false,
	discountDen: false,
};
export const CARD_FEE = 100;
export const BONUS_MILES = 50_000;
export const PASS_PRICE = 399;
export const PASS_DISCOUNT = 50;
export const DEN_FEE = 59.99;

export const PURCHASE_OPTIONS: Purchases[] = [false, true].flatMap((card) =>
	[false, true].flatMap((goWild) =>
		[false, true].map((discountDen) => ({ card, goWild, discountDen })),
	),
);

export function passCost({ card, discountDen }: Purchases) {
	return PASS_PRICE - (card || discountDen ? PASS_DISCOUNT : 0);
}
