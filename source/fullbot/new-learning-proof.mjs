import fs from 'node:fs';
import crypto from 'node:crypto';
import {createGame} from './engine.mjs';
import {RvfDatabase} from '@ruvector/rvf';

const prefix=new URL('./new-learning-proof',import.meta.url).pathname;
const prereg={
 createdAt:new Date().toISOString(), trainSeeds:Array.from({length:64},(_,i)=>310001+i),
 testSeeds:Array.from({length:256},(_,i)=>870001+i),samples:60,
 candidates:[
 {aggressionThreshold:.67,callMargin:.02,potFraction:.65},
 {aggressionThreshold:.55,callMargin:.08,potFraction:1},
 {aggressionThreshold:.75,callMargin:0,potFraction:.35},
 {aggressionThreshold:.60,callMargin:.12,potFraction:.9},
 {aggressionThreshold:.85,callMargin:.04,potFraction:1.2}],
 selection:'highest mean training profit over both seats; earliest index breaks ties; holdout evaluated once after selection',
 unit:'big blinds per hand; each seed evaluated from both seats; fresh 100bb stacks every hand',
 disclaimer:'Explicit feedback selection loop learns tunings. RVF remembers numeric experience and retrieves policy ID; RVF is not claimed to optimize parameters intrinsically.'
};
fs.writeFileSync(prefix+'-preregister.json',JSON.stringify(prereg,null,2),{flag:'wx'});
const started=Date.now(),experience=[],streetCounts={preflop:0,flop:0,turn:0,river:0};
function hand(seed,seat,tuning,record,phase,policy){
 const g=createGame({seed});g.start();let steps=0;
 while(!g.state().complete){if(++steps>300)throw Error('action bound');const s=g.state();streetCounts[s.street]=(streetCounts[s.street]||0)+1;g.bot(s.actingSeat,{mode:s.actingSeat===seat?'expert':'novice',samples:prereg.samples,tuning:s.actingSeat===seat?tuning:{}});}
 const profit=(g.state().players[seat].stack-200)/2;
 if(record)experience.push({id:phase+'-p'+policy+'-s'+seed+'-seat'+seat,policy,seed,seat,profit});
 return profit;
}
function pair(seed,tuning,record,phase,policy){return (hand(seed,0,tuning,record,phase,policy)+hand(seed,1,tuning,record,phase,policy))/2}
const means=prereg.candidates.map((t,p)=>prereg.trainSeeds.reduce((a,s)=>a+pair(s,t,true,'train',p),0)/prereg.trainSeeds.length);
const selected=means.indexOf(Math.max(...means));
fs.writeFileSync(prefix+'-selection.json',JSON.stringify({selected,means,tuning:prereg.candidates[selected],frozenBeforeHoldout:true},null,2),{flag:'wx'});
let storeProof;
const rvfPath=prefix+'-experience.rvf';
try{
 const db=await RvfDatabase.create(rvfPath,{dimensions:5,metric:'l2'});
 const entries=experience.map(e=>({id:e.id,vector:new Float32Array([...Object.values(prereg.candidates[e.policy]),e.profit/100,0])}));
 entries.push({id:'selected-policy-'+selected,vector:new Float32Array([...Object.values(prereg.candidates[selected]),0,1])});
 const ingest=await db.ingestBatch(entries);await db.close();
 const reopened=await RvfDatabase.open(rvfPath);
 const query=new Float32Array([...Object.values(prereg.candidates[selected]),0,1]);
 const retrieved=await reopened.query(query,1);await reopened.close();
 const expected='selected-policy-'+selected;
 if(retrieved[0]?.id!==expected)throw Error('reopen selected policy retrieval mismatch '+JSON.stringify(retrieved));
 const loadedIndex=Number(retrieved[0].id.split('-').at(-1));
 const demo=createGame({seed:900001});demo.start();
 const demoSeat=demo.state().actingSeat;
 const decision=demo.bot(demoSeat,{mode:'expert',samples:60,tuning:prereg.candidates[loadedIndex]}).decision;
 storeProof={success:true,path:rvfPath,ingest,retrieved,reopenedPolicyUsedForActualDecision:decision,bytes:fs.statSync(rvfPath).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(rvfPath)).digest('hex')};
}catch(e){storeProof={success:false,error:e.stack};}
const holdout=prereg.testSeeds.map(seed=>({seed,baseline:pair(seed,prereg.candidates[0],false,'test',0),candidate:pair(seed,prereg.candidates[selected],false,'test',selected)}));
const deltas=holdout.map(x=>x.candidate-x.baseline),avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
const mean=avg(deltas),sd=Math.sqrt(deltas.reduce((a,x)=>a+(x-mean)**2,0)/(deltas.length-1)),se=sd/Math.sqrt(deltas.length);
const receipt={
 startedAt:prereg.createdAt,finishedAt:new Date().toISOString(),elapsedMs:Date.now()-started,preregistered:prereg,trainingMeansBbPerHand:means,selectedIndex:selected,selectedTuning:prereg.candidates[selected],holdoutCount:holdout.length,pairedHandsPerPolicy:holdout.length*2,baselineBbPerHand:avg(holdout.map(x=>x.baseline)),candidateBbPerHand:avg(holdout.map(x=>x.candidate)),deltaBbPerHand:mean,normalApprox95Ci:[mean-1.96*se,mean+1.96*se],standardError:se,improvementEstablished:mean-1.96*se>0,streetCounts,storeProof,holdout,experience,
 limitations:['One seeded random novice opponent only. No strong-player or GTO claim.','60 equity rollouts per decision. Finite training grid and limited seed count.','Normal approximation confidence interval over paired seed clusters, not an exact inference.','Standalone bounded experiment only; existing presentation/browser is not connected to this policy.','RVF SDK metadata unsupported; human-readable policy config and receipt outside RVF. Numeric training experiences and selected policy ID in real RVF.']
};
fs.writeFileSync(prefix+'-receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
console.log(JSON.stringify({...receipt,holdout:undefined,experience:undefined,preregistered:undefined},null,2));
