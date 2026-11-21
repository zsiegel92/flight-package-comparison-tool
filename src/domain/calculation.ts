import type { Scenario, Result, LegPlan, OutPlan, CommittedMode } from './types';

const pct = (n:number) => Math.min(1, Math.max(0,n/100));
export function calculateScenario(s:Scenario):Result {
 const baseBag = pct(s.carryShare)*s.regularCarry + pct(s.checkedShare)*s.regularChecked;
 const passBag = pct(s.carryShare)*s.gwCarry + pct(s.checkedShare)*s.gwChecked;
 const base = (dir:'fri'|'sun') => (dir==='fri'?s.fareFri:s.fareSun)+baseBag;
 const lateBase = (dir:'fri'|'sun') => (dir==='fri'?s.lateFareFri:s.lateFareSun)+baseBag;
 const earlyProb = (dir:'fri'|'sun')=>pct(dir==='fri'?s.earlyOfferFri:s.earlyOfferSun);
 const lateProb = (dir:'fri'|'sun')=>pct(dir==='fri'?s.lateSuccessFri:s.lateSuccessSun);
 const gowild = (dir:'fri'|'sun',early:boolean) => {
   const fee=early ? (dir==='fri'?s.earlyFeeFri:s.earlyFeeSun):0;
   const peak=(dir==='fri'?s.peakChargeFri:s.peakChargeSun)*pct(dir==='fri'?s.peakShareFri:s.peakShareSun);
   // When the user selects 'max', approximate the greater fee, per charged date.
   const peakShare=pct(dir==='fri'?s.peakShareFri:s.peakShareSun);
   const chargedPeak=(dir==='fri'?s.peakChargeFri:s.peakChargeSun);
   const additive= s.feeStack==='sum' ? fee+peak : (1-peakShare)*fee+peakShare*Math.max(fee,chargedPeak);
   return s.gwTaxes+passBag+s.seatExtra+additive;
 };
 const earlyEffective=(dir:'fri'|'sun')=>gowild(dir,true) < base(dir) ? earlyProb(dir) : 0;
 const advance = (dir:'fri'|'sun'):LegPlan => ({cost:base(dir),gw:0,prepaid:base(dir),note:'Regular Frontier booked in advance'});
 const earlyAdvance=(dir:'fri'|'sun'):LegPlan => {
   const p=earlyEffective(dir);return {cost:p*gowild(dir,true)+(1-p)*base(dir),gw:p,prepaid:p*gowild(dir,true)+(1-p)*base(dir),note:'Try early GoWild; buy ordinary advance fare if unavailable or worse value'};
 };
 const lateBackup=(dir:'fri'|'sun'):LegPlan => {
   const p=lateProb(dir);
   // Availability probability means a usable (economical) seat, not merely any seat.
   return {cost:p*gowild(dir,false)+(1-p)*lateBase(dir),gw:p,prepaid:0,note:'Try day-before GoWild; if unavailable, pay a last-minute regular fare'};
 };
 const earlyLateBackup=(dir:'fri'|'sun'):LegPlan => {
   const pe=earlyEffective(dir), pl=lateProb(dir);
   const earlyCost=pe*gowild(dir,true), lateCost=(1-pe)*(pl*gowild(dir,false)+(1-pl)*lateBase(dir));
   return {cost:earlyCost+lateCost,gw:pe+(1-pe)*pl,prepaid:earlyCost,note:'Early quote first; otherwise attempt day before; then last-minute fallback'};
 };
 const committed=(dir:'fri'|'sun',mode:CommittedMode):LegPlan => mode==='advance' ? advance(dir) : mode==='early-advance' ? earlyAdvance(dir):lateBackup(dir);
 const optOut=():OutPlan=>{
   if(s.optionalOut==='advance') return {probability:1,weightedCost:base('fri'),weightedGw:0,detail:'Regular advance Friday, always depart'};
   if(s.optionalOut==='late') {const p=lateProb('fri');return {probability:p,weightedCost:p*gowild('fri',false),weightedGw:p,detail:'Try on Thursday; if no usable seat, skip entire weekend'};}
   if(s.optionalOut==='early') {const p=earlyEffective('fri');return {probability:p,weightedCost:p*gowild('fri',true),weightedGw:p,detail:'Accept only an economical early Friday offer; otherwise skip'};}
   const pe=earlyEffective('fri'),pl=lateProb('fri');
   return {probability:pe+(1-pe)*pl,weightedCost:pe*gowild('fri',true)+(1-pe)*pl*gowild('fri',false),weightedGw:pe+(1-pe)*pl,detail:'Try an economical early Friday offer, otherwise retry on Thursday; skip if both fail'};
 };
 const out=optOut();
 const optReturn:LegPlan = s.optionalReturn==='advance' ? advance('sun') : s.optionalReturn==='early-advance' ? earlyAdvance('sun') : s.optionalReturn==='late-backup' ? lateBackup('sun') : earlyLateBackup('sun');
 const prepaidProbability = s.optionalReturn === 'advance' || s.optionalReturn === 'early-advance' ? 1 : s.optionalReturn === 'early-late-backup' ? earlyEffective('sun') : 0;
 optReturn.cost += prepaidProbability * s.optionalReturnFlexPremium;
 optReturn.prepaid += prepaidProbability * s.optionalReturnFlexPremium;
 const cFri=committed('fri',s.committedOut),cSun=committed('sun',s.committedReturn);
 const nOpt=Math.min(s.weekends,s.optionalWeekends), nComm=Math.max(0,s.weekends-nOpt);
 const p=out.probability, success=nOpt*p;
 const successOutCost = p>0 ? out.weightedCost/p : 0;
 const optionalTripCost=successOutCost+optReturn.cost;
 // No saving is credited for skipped trips; any pre-purchased return can be forfeited.
 const sunk=nOpt*(1-p)*optReturn.prepaid*pct(s.sunkReturnPct);
 const replacement=pct(s.replacePct);
 const baseline=base('fri')+base('sun');
 const optValue=success*(replacement*baseline-optionalTripCost)-sunk;
 const commValue=nComm*(baseline-cFri.cost-cSun.cost);
 const cashGross=optValue+commValue;
 const fixedCost = s.passPrice + s.annualFriction + (s.discountDen ? s.denMembershipCost : 0) + (s.card ? s.cardAnnualFee : 0) - (s.discountDen || s.card ? Math.min(s.passPrice, s.denPassDiscount) : 0);
 const gwCount=nOpt*(out.weightedGw+p*optReturn.gw)+nComm*(cFri.gw+cSun.gw);
 // Illustrative pro-rata allocation across completed non-GoWild legs; use only welcome miles.
 const regularLegs = Math.max(0, 2*(nComm+success)-gwCount);
 const awardFlights = s.card && s.awardMilesPerFlight > 0 ? Math.min(regularLegs*pct(s.awardFlightShare), s.cardBonusMiles/s.awardMilesPerFlight) : 0;
 const awardSavings = awardFlights * Math.max(0, (s.fareFri+s.fareSun)/2-s.awardFees);
 const net=cashGross-fixedCost+awardSavings;
 // Estimate net retained spending: forfeited prepaid amounts count, recovered value does not.
 const estimatedFrontierSpend = Math.max(0, s.passPrice - (s.discountDen || s.card ? Math.min(s.passPrice, s.denPassDiscount) : 0)) + (s.discountDen ? s.denMembershipCost : 0) + nOpt * (out.weightedCost + p * optReturn.cost) + sunk + nComm * (cFri.cost + cSun.cost) - awardSavings;
 const estimatedEligibleSpend = estimatedFrontierSpend * pct(s.cardEligiblePct);
 const estimatedLateGW=nOpt*((s.optionalOut==='late'?p:s.optionalOut==='early-late'?(1-earlyEffective('fri'))*lateProb('fri'):0)+p*(s.optionalReturn==='late-backup'?lateProb('sun'):s.optionalReturn==='early-late-backup'?(1-earlyEffective('sun'))*lateProb('sun'):0)) + nComm*((s.committedOut==='late-backup'?lateProb('fri'):0)+(s.committedReturn==='late-backup'?lateProb('sun'):0));
 const breakRT=Math.max(0,baseline-2*(s.gwTaxes+passBag+s.seatExtra+((pct(s.peakShareFri)*s.peakChargeFri+pct(s.peakShareSun)*s.peakChargeSun)/2)));
 return {
   committedCount:nComm,optionalCount:nOpt,successVisits:nComm+success,skippedVisits:nOpt*(1-p),
   awardFlights, awardSavings, estimatedFrontierSpend, estimatedEligibleSpend,
   pointsValue: s.card ? (s.cardBonusMiles - awardFlights*s.awardMilesPerFlight + s.cardMilesPerDollar * estimatedEligibleSpend) * s.mileValueCents / 100 : 0,
   optionalValue:optValue,committedValue:commValue,grossCash:cashGross,netCash:net,
   netWithVisitValue:net+success*(1-replacement)*s.incrementalVisitValue,sunkExposure:sunk,
   expectedGwLegs:gwCount,lateGwLegs:estimatedLateGW,earlyGwLegs:Math.max(0,gwCount-estimatedLateGW),
   baselineRoundtrip:baseline,optionalOut:out,optionalReturn:optReturn,commFri:cFri,commSun:cSun,
   passBreakEvenRT:breakRT>0?Math.ceil(fixedCost/breakRT):Infinity
 };
}
