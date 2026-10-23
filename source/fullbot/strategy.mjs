import {equity,rng} from './oracle.mjs';
export function decide(view,{mode='expert',samples=180,seed=1,tuning={}}={}){
 if(!view||!view.legal)throw Error('Missing legal player view');
 const {aggressionThreshold=.67,callMargin=.02,potFraction=.65}=tuning;
 if(![aggressionThreshold,callMargin,potFraction].every(Number.isFinite)||aggressionThreshold<0||aggressionThreshold>1||callMargin<0||callMargin>.2||potFraction<.1||potFraction>2)throw Error('Invalid strategy tuning');
 const l=view.legal;
 const aggressive=amount=>({type:view.currentBet>0?'raise':'bet',amount});
 const passive=l.canCheck?{type:'check'}:l.callAmount!==null?{type:'call'}:{type:'fold'};
 if(mode==='novice'){
  const candidates=[passive];
  if(l.canFold&&!l.canCheck)candidates.push({type:'fold'});
  if(l.minRaiseTo!==null)candidates.push(aggressive(l.minRaiseTo));
  return {action:candidates[Math.floor(rng(seed)()*candidates.length)],mode,reason:'Seeded random legal baseline'};
 }
 if(mode!=='expert')throw Error('Unknown bot mode');
 if(!Number.isSafeInteger(samples)||samples<1||samples>10000)throw Error('Invalid sample count');
 const e=equity(view.holeCards,view.board,{samples,seed}),cost=l.callAmount||0,potOdds=cost/(view.pot+cost||1);
 let action=passive;
 if(!l.canCheck&&e+callMargin<potOdds)action={type:'fold'};
 else if(e>aggressionThreshold&&l.minRaiseTo!==null){const amount=Math.min(l.maxRaiseTo,Math.max(l.minRaiseTo,view.committedThisStreet+cost+Math.ceil((view.pot+cost)*potFraction)));action=aggressive(amount);}
 return {action,mode,equity:e,potOdds,samples,tuning:{aggressionThreshold,callMargin,potFraction},reason:'Public-card Monte Carlo equity and pot odds; no GTO claim'};
}
