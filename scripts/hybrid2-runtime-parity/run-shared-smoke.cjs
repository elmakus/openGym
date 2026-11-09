#!/usr/bin/env node
'use strict'
// Exact original fitness fixture, real pinned Liftosaur runtime, no simulator.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto')
const root=process.env.LIFTOSAUR_RUNTIME_ROOT,fitness=process.env.FITNESS_ROOT
if(!root||!fitness)throw Error('LIFTOSAUR_RUNTIME_ROOT and FITNESS_ROOT required')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(root,'README.txt'),'utf8').includes(pin))throw Error('runtime pin')
const api=require(path.join(root,'runtime_api.cjs'))
const fixture=fs.readFileSync(path.join(fitness,'tests/hybrid2/fixtures/h2m02_t02_naive_stale_overwrite.liftoscript'),'utf8')
const SHA=s=>crypto.createHash('sha256').update(s).digest('hex')
if(SHA(fixture)!=='448c34c631b2d1cdb71bfcbe4148198982fba1b39e0193a8f768c3cb5035b5a8')
  throw Error('Original 344-byte fixture SHA mismatch')
function run(t,commands){const x=api.Playground_run({programText:t,week:1,day:1,commands},api.settings,api.defaultStats());if(!x.success||!x.data?.updatedProgramText)throw Error(JSON.stringify(x));return x.data.updatedProgramText}
function state(t){const w=api.PlannerProgram_evaluateText(t),p={vtype:'program',id:'x',name:'x',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:w.length>1,tags:[],clonedAt:0,planner:{vtype:'planner',name:'x',weeks:w}};return api.Program_evaluate(p,api.settings).states['41']}
const cases=[
  ['shared_normal',fixture,['complete_set(1,1)','complete_set(2,1)','finish_workout()'],0],
  ['shared_skip_earlier',fixture,['complete_set(1,1)','finish_workout()'],1],
  ['distinct_identity',fixture.replace('## Day 2\nBench Press /','## Day 2\nDeadlift /'),['complete_set(1,1)','complete_set(2,1)','finish_workout()'],1]
]
const records=cases.map(([scenario,source,commands,expected])=>{const next=run(source,commands),s=state(next);return {scenario,commands,expected,actual:s.seen1,updatedProgramSha256:SHA(next),pass:s.seen1===expected}})
console.log(JSON.stringify({schema:'HYBRID2-SHARED-REAL-RUNTIME-1',runtimePin:pin,sourceCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',records},null,2))
if(records.some(x=>!x.pass))process.exitCode=1
