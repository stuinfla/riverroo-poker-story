import {Table,fixedBlinds,playerView as allowedView,formatCard} from '@jev-poker/engine';
import {decide} from './strategy.mjs';

export function createGame({seed=42,stacks=[200,200],smallBlind=1,bigBlind=2}={}) {
 if(!Number.isInteger(seed)||!Array.isArray(stacks)||stacks.length!==2||stacks.some(x=>!Number.isSafeInteger(x)||x<=0)||!Number.isSafeInteger(smallBlind)||!Number.isSafeInteger(bigBlind)||smallBlind<1||bigBlind<=smallBlind) throw Error('Invalid game configuration');
 const table=new Table({format:'tournament',blinds:fixedBlinds(smallBlind,bigBlind),startingStack:200,seats:[{id:0,name:'Player',kind:'human'},{id:1,name:'RiverRoo',kind:'cpu'}],seed});
 table.seats.forEach((s,i)=>s.stack=stacks[i]);
 let actions=[],events=[],showdown=[],awards=[];
 table.on(e=>{events.push(e);if(e.type==='ActionTaken')actions.push(e);if(e.type==='PotAwarded')awards=e.awards.map(x=>({...x}));if(e.type==='Showdown')showdown=e.hands.map(h=>({seat:h.seat,cards:h.cards.map(formatCard)}));});
 const validateSeat=seat=>{if(seat!==0&&seat!==1)throw Error('Invalid seat');};
 function playerView(seat=0){
  validateSeat(seat);const s=table.snapshot();if(!s)return null;
  const v=allowedView(s,seat,actions);
  return {...v,holeCards:v.holeCards.map(formatCard),board:v.board.map(formatCard),legal:table.legalActions(seat)};
 }
 function state(seat=0) {
  validateSeat(seat);const s=table.snapshot();
  if(!s)return {handNumber:table.handNumber,complete:true,street:null,board:[],players:table.seats.map(p=>({seat:p.id,stack:p.stack,holeCards:[]})),actingSeat:null,pot:0,legal:null,history:[],showdown:[]};
  return {handNumber:s.handNumber,button:s.button,street:s.street,board:s.board.map(formatCard),players:s.players.map(p=>({...p,holeCards:p.seat===seat?p.holeCards.map(formatCard):(showdown.find(h=>h.seat===p.seat)?.cards||[])})),actingSeat:s.actingSeat,pot:s.pot,complete:s.complete,legal:table.legalActions(seat),history:actions.map(e=>({street:e.street,seat:e.seat,action:e.action,amount:e.amount,allIn:e.allIn})),showdown:structuredClone(showdown),awards:structuredClone(awards)};
 }
 function start(){if(table.snapshot()&&!table.snapshot().complete)throw Error("Hand in progress");actions=[];events=[];showdown=[];awards=[];table.startHand();return state();}
 function act(seat,action){validateSeat(seat);if(!action||!['fold','check','call','bet','raise','allin'].includes(action.type))throw Error('Invalid action');if(['bet','raise'].includes(action.type)&&(!Number.isSafeInteger(action.amount)||action.amount<=0))throw Error('Invalid amount');table.act(seat,action);return state();}
 function bot(seat,{mode='expert',samples=180,tuning={}}={}){const s=table.snapshot();if(!s||s.complete||s.actingSeat!==seat)throw Error('Not this seat turn');const v=playerView(seat);const decision=decide(v,{mode,samples,tuning,seed:seed+':'+s.handNumber+':'+actions.length+':'+seat});act(seat,decision.action);return {decision,state:state()};}
 function playHand({modes=['novice','expert'],maxActions=300,samples=180,tunings=[{},{}]}={}){if(!table.snapshot()||table.snapshot().complete)start();let n=0;while(!table.snapshot().complete){if(++n>maxActions)throw Error('Action bound exceeded');bot(table.snapshot().actingSeat,{mode:modes[table.snapshot().actingSeat],samples,tuning:tunings[table.snapshot().actingSeat]});}return state();}
 return {state,playerView,start,act,bot,playHand};
}
