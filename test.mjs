import test from 'node:test';
import assert from 'node:assert/strict';
import {run} from './engine.mjs';
import {sample} from './sample.mjs';
test('domain behavior and boundary cases',()=>{assert.equal(run(sample).metrics.uncovered,2);assert.equal(run(sample).metrics.changed,4);assert.throws(()=>run({files:[{path:'a',changed:[0],covered:[]}]}));});
test('deterministic result and input preservation',()=>{const copy=JSON.stringify(sample);assert.deepEqual(run(sample),run(sample));assert.equal(JSON.stringify(sample),copy);});
test('reject malformed root and oversized input',()=>{assert.throws(()=>run(null));assert.throws(()=>run([]));assert.throws(()=>run({...sample,oversized:'x'.repeat(200001)}));});

test('instrumentation separates misses from unknown lines', () => {
  const report=run({files:[{path:'a',changed:[1,2,3,4],covered:[1],instrumented:[1,2]}]});
  assert.deepEqual(report.metrics,{files:1,changed:4,covered:1,uncovered:1,unknown:2});
  assert.equal(report.summary.complete,false);
  assert.equal(report.summary.measuredCoveragePercent,50);
  assert.deepEqual(report.evidence[0].unknownRanges,[{start:3,end:4}]);
});
test('100 percent measured coverage does not imply complete evidence', () => {
  const report=run({files:[{path:'a',changed:[1,2],covered:[1],instrumented:[1]}]});
  assert.equal(report.summary.measuredCoveragePercent,100);
  assert.equal(report.summary.complete,false);
});
test('no measured lines produces null rather than a perfect percentage', () => {
  const report=run({files:[{path:'a',changed:[1],covered:[],instrumented:[]}]});
  assert.equal(report.rows[0].measuredCoveragePercent,null);
  assert.equal(report.summary.measuredCoveragePercent,null);
  assert.equal(run({files:[]}).summary.measuredCoveragePercent,null);
});
test('deduplicate and compress consecutive gaps without changing input', () => {
  const input={files:[{path:'a',changed:[9,3,2,2,1,7],covered:[]}]};
  const copy=JSON.stringify(input), report=run(input);
  assert.deepEqual(report.evidence[0].uncoveredRanges,[{start:1,end:3},{start:7,end:7},{start:9,end:9}]);
  assert.equal(report.metrics.changed,5);
  assert.equal(JSON.stringify(input),copy);
});
test('reject duplicate paths and contradictory instrumentation', () => {
  const file={path:'a',changed:[1],covered:[]};
  assert.throws(()=>run({files:[file,file]}));
  assert.throws(()=>run({files:[{...file,covered:[2],instrumented:[1]}]}));
});
test('aggregate measured coverage by lines rather than averaging file percentages', () => {
  const report=run({files:[{path:'a',changed:[1],covered:[1]}, {path:'b',changed:[1,2,3],covered:[]}]});
  assert.equal(report.summary.measuredCoveragePercent,25);
  assert.equal(report.summary.complete,true);
});
test('exhaustive four-line partitions retain every changed line exactly once', () => {
  for(let mask=0;mask<81;mask++) {
    let n=mask;const covered=[],instrumented=[],expected=[[],[],[]];
    for(let line=1;line<=4;line++){const state=n%3;n=Math.floor(n/3);expected[state].push(line);if(state<2)instrumented.push(line);if(state===0)covered.push(line);}
    const e=run({files:[{path:'a',changed:[1,2,3,4],covered,instrumented}]}).evidence[0];
    assert.deepEqual([e.coveredLines,e.uncoveredLines,e.unknownLines],expected);
  }
});
