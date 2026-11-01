import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,chmodSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const old='a'.repeat(40),head='b'.repeat(40),script=resolve('.github/scripts/pages-lock.mjs');
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'pages-lock-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const data=join(dir,'api.json'),gh=join(dir,'gh');
const initial={records:[{id:20,sha:head,environment:'github-pages'},{id:10,sha:old,environment:'github-pages'}],states:{20:'in_progress',10:'success'},pages:{[old]:'succeed',[head]:'deployment_queued'},runs:[],mutations:[]};
 writeFileSync(data,JSON.stringify(initial));
 writeFileSync(gh,`#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
const file=process.env.PAGES_FIXTURE,s=JSON.parse(readFileSync(file,'utf8')),a=process.argv.slice(2),method=a.includes('--method')?a[a.indexOf('--method')+1]:'GET';
const p=a[1].replace('repos/BillLaiTrade/k12-learning-demos/','');let result;
if(method!=='GET')s.mutations.push({method,path:p});
if(p.startsWith('deployments?')){const sha=new URLSearchParams(p.split('?')[1]).get('sha');result=s.records.filter(r=>!sha||r.sha===sha);}
else if(p.startsWith('actions/workflows/'))result={workflow_runs:s.runs};
else if(p.startsWith('actions/runs/'))result=s.runs.find(r=>r.id===Number(p.split('/').at(-1)));
else if(p.startsWith('pages/deployments/')){if(method==='POST'){if(s.cancelFinished){writeFileSync(file,JSON.stringify(s));process.stdout.write(JSON.stringify({status:'400',message:"Unable to cancel deployment as it's finished."}));process.exit(1);}s.pages[p.split('/').at(-2)]='cancelled';}result={status:s.pages[p.split('/').at(-1)]||''};}
else {const id=Number(p.split('/')[1]);if(p.endsWith('/statuses')){if(method==='POST')s.states[id]='inactive';result=[{state:s.states[id]}];}else if(method==='DELETE'){s.records=s.records.filter(r=>r.id!==id);result=null;}else result=s.records.find(r=>r.id===id);}
writeFileSync(file,JSON.stringify(s));process.stdout.write(result===null?'':JSON.stringify(result));
`);
 // Use an .mjs entry so the mock is independent of package.json module mode.
 const module=gh+'.mjs';writeFileSync(module,readFileSync(gh));chmodSync(module,0o700);
 const output=join(dir,'outputs');writeFileSync(output,'');
 const env={...process.env,GITHUB_REPOSITORY:'BillLaiTrade/k12-learning-demos',GITHUB_SHA:head,PAGES_LOCK_GH:module,PAGES_FIXTURE:data,PAGES_LOCK_DIR:join(dir,'backup'),GITHUB_OUTPUT:output};
 return{env,data,output,read:()=>JSON.parse(readFileSync(data,'utf8')),update(fn){const s=this.read();fn(s);writeFileSync(data,JSON.stringify(s));},run(mode,extra={}){return spawnSync(process.execPath,[script,mode],{env:{...env,...extra},encoding:'utf8'});},plan(){return JSON.parse(readFileSync(join(env.PAGES_LOCK_DIR,'completed-deployment.json'),'utf8'));}};
}
test('planning archives the prior completed record and its history without mutating GitHub',t=>{const f=fixture(t),r=f.run('plan');assert.equal(r.status,0,r.stderr);assert.equal(f.plan().record.id,10);assert.equal(f.plan().statuses[0].state,'success');assert.deepEqual(f.read().mutations,[]);assert.match(readFileSync(f.output,'utf8'),/found=true/);});
test('current revision is never selected',t=>{const f=fixture(t);f.update(s=>{s.records=s.records.filter(r=>r.id===20);s.states[20]='success';s.pages[head]='succeed';});assert.equal(f.run('plan').status,0);assert.equal(f.plan(),null);assert.deepEqual(f.read().mutations,[]);});
test('an active prior deployment is preserved',t=>{const f=fixture(t);f.update(s=>s.states[10]='in_progress');assert.equal(f.run('plan').status,0);assert.equal(f.plan(),null);assert.deepEqual(f.read().mutations,[]);});
test('a generic success does not override Pages still publishing',t=>{const f=fixture(t);f.update(s=>s.pages[old]='deployment_in_progress');assert.equal(f.run('plan').status,0);assert.equal(f.plan(),null);});
test('an active sibling of the completed revision prevents repair',t=>{const f=fixture(t);f.update(s=>{s.records.push({id:11,sha:old,environment:'github-pages'});s.states[11]='queued';});assert.equal(f.run('plan').status,0);assert.equal(f.plan(),null);});
test('a local backup without a successful remote artifact cannot authorize deletion',t=>{const f=fixture(t);assert.equal(f.run('plan').status,0);const r=f.run('apply');assert.notEqual(r.status,0);assert.match(r.stderr,/remote backup/);assert.deepEqual(f.read().mutations,[]);});
test('a deployment becoming active after backup is preserved',t=>{const f=fixture(t);assert.equal(f.run('plan').status,0);f.update(s=>s.states[10]='in_progress');assert.notEqual(f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123'}).status,0);assert.deepEqual(f.read().mutations,[]);});
test('a backup from another publisher cannot be applied',t=>{const f=fixture(t);assert.equal(f.run('plan').status,0);assert.notEqual(f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123',GITHUB_SHA:'c'.repeat(40)}).status,0);assert.deepEqual(f.read().mutations,[]);});
test('after remote backup, retire metadata before releasing the corresponding Pages lock',t=>{const f=fixture(t);assert.equal(f.run('plan').status,0);const r=f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123'});assert.equal(r.status,0,r.stderr);const s=f.read();assert.deepEqual(s.mutations,[{method:'POST',path:'deployments/10/statuses'},{method:'DELETE',path:'deployments/10'},{method:'POST',path:`pages/deployments/${old}/cancel`}]);assert.deepEqual(s.records,[{id:20,sha:head,environment:'github-pages'}]);assert.equal(s.states[20],'in_progress');assert.equal(f.plan().record.id,10);});
test('a successful completed publisher can identify an orphaned Pages lock after metadata was removed',t=>{const f=fixture(t);f.update(s=>{s.records=s.records.filter(r=>r.id!==10);s.runs=[{id:30,head_sha:old,status:'completed',conclusion:'success'}];});assert.equal(f.run('plan').status,0);assert.equal(f.plan().record,null);assert.equal(f.plan().run.id,30);const r=f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123'});assert.equal(r.status,0,r.stderr);assert.deepEqual(f.read().mutations,[{method:'POST',path:`pages/deployments/${old}/cancel`}]);});
test('an orphaned Pages lock cannot be released if its publisher starts running again',t=>{const f=fixture(t);f.update(s=>{s.records=s.records.filter(r=>r.id!==10);s.runs=[{id:30,head_sha:old,status:'completed',conclusion:'success'}];});assert.equal(f.run('plan').status,0);f.update(s=>s.runs[0].status='in_progress');assert.notEqual(f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123'}).status,0);assert.deepEqual(f.read().mutations,[]);});
test('already-finished cancellation is rechecked before letting the real publisher verify recovery',t=>{const f=fixture(t);f.update(s=>s.cancelFinished=true);assert.equal(f.run('plan').status,0);const r=f.run('apply',{PAGES_LOCK_ARCHIVE_ID:'123'});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Proceeding to the real publisher/);assert.equal(f.read().records.some(r=>r.id===10),false);assert.equal(f.plan().record.id,10);});
