import type { Scenario } from './types';

export const BASE: Scenario = {
 id:'middle',name:'01 · Practical middle',rationale:'Middle-of-the-road 15 visits, eight optional. Friday evening seats succeed 65% of the time; prepaid Sunday protection creates some sunk-ticket exposure. Committed weekends try early GoWild only when it beats buying Frontier normally.',
 weekends:15,optionalWeekends:8,replacePct:90,optionalOut:'late',optionalReturn:'early-advance',committedOut:'early-advance',committedReturn:'early-advance',
 fareFri:140,fareSun:165,lateFareFri:230,lateFareSun:270,card:false,cardAnnualFee:99,cardBonusMiles:50000,awardMilesPerFlight:5000,awardFlightShare:50,awardFees:5.6,cardMilesPerDollar:17,cardEligiblePct:80,mileValueCents:1,discountDen:false,denMembershipCost:69.99,denPassDiscount:50,passPrice:399,gwTaxes:15,earlyFeeFri:69,earlyFeeSun:69,
 lateSuccessFri:65,lateSuccessSun:60,earlyOfferFri:65,earlyOfferSun:70,
 peakShareFri:8,peakShareSun:10,peakChargeFri:89,peakChargeSun:89,feeStack:'sum',
 carryShare:0,checkedShare:0,regularCarry:48,gwCarry:65,regularChecked:45,gwChecked:65,
 seatExtra:0,annualFriction:0,sunkReturnPct:100,optionalReturnFlexPremium:0,incrementalVisitValue:0
};
export const SEEDS: Scenario[] = [
 { ...BASE, id:'skeptic', name:'01 · Skeptical / low fares', rationale:'Stress test: only 12 trips, cheaper regular tickets, weak Friday availability, high early charges, and more peak exposure. Shows how the pass can lose money without assuming that every failed optional trip forces an emergency purchase.',
 weekends:12,optionalWeekends:5,replacePct:75,fareFri:90,fareSun:110,lateSuccessFri:35,lateSuccessSun:40,earlyOfferFri:45,earlyOfferSun:50,earlyFeeFri:99,earlyFeeSun:99,peakShareFri:18,peakShareSun:18,peakChargeFri:110,peakChargeSun:110,optionalReturn:'advance',committedOut:'advance',committedReturn:'early-advance' },
 { ...BASE, name:'02 · Practical middle', id:'middle', rationale:'Central case: 15 visits, eight optional. Some Thursday seats work, you protect Sunday in advance and take the sunk-cost risk when Friday falls through. Important weekends try early GoWild only when cheaper than ordinary Frontier tickets.' },
 { ...BASE, id:'flexible', name:'03 · Flexible Fridays', rationale:'Fifteen visits, ten flexible weekends, frequent successful Thursday bookings and normal Sunday returns. Makes it easy to see the value from only a few discounted Friday legs without assuming cheap Sunday GoWild availability.',
 weekends:15,optionalWeekends:10,replacePct:100,lateSuccessFri:78,optionalReturn:'advance',committedOut:'advance',committedReturn:'early-advance',fareFri:160,fareSun:170,earlyFeeSun:59,peakShareFri:5,peakShareSun:5 },
 { ...BASE, id:'upside', name:'04 · Expensive weekend fares', rationale:'Upper-value case: 17 visits, higher Friday/Sunday regular fares, good inventory and relatively cheap early offers. Illustrates the upside if weekend demand makes the tickets you avoid expensive.',
 weekends:17,optionalWeekends:10,replacePct:100,fareFri:195,fareSun:220,lateFareFri:320,lateFareSun:360,lateSuccessFri:80,lateSuccessSun:70,earlyOfferFri:85,earlyOfferSun:85,earlyFeeFri:59,earlyFeeSun:59,peakShareFri:5,peakShareSun:5,peakChargeFri:69,peakChargeSun:69,optionalOut:'early-late',optionalReturn:'early-advance' },
 { ...BASE, id:'returnrisk', name:'05 · Unprotected Sundays', rationale:'Risk scenario: optional Fridays are booked at the last minute, and Sunday GoWild is attempted only after you have arrived. If it fails, you must buy a high-priced last-minute return to be at work Monday. Compare directly with the protected-Sunday cases.',
 weekends:14,optionalWeekends:9,replacePct:100,optionalReturn:'late-backup',committedOut:'early-advance',committedReturn:'advance',lateSuccessFri:60,lateSuccessSun:35,lateFareSun:345,earlyFeeFri:79,earlyFeeSun:99,peakShareFri:12,peakShareSun:12 }
];

