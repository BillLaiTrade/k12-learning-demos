import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';

const repo=process.env.GITHUB_REPOSITORY,head=process.env.GITHUB_SHA;
const folder=process.env.PAGES_LOCK_DIR;
if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||!/^[a-f0-9]{40}$/.test(head||'')||!folder)throw Error('Missing valid repository, revision or backup directory.');
const prefix=`repos/${repo}/`,file=join(folder,'completed-deployment.json');
function api(path,method='GET',fields={}){
 const args=['api',prefix+path,'-H','X-GitHub-Api-Version: 2026-03-10'];
 if(method!=='GET')args.push('--method',method);
 for(const[key,value]of Object.entries(fields))args.push('-f',`${key}=${value}`);
 const body=execFileSync(process.env.PAGES_LOCK_GH||'gh',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
 return body.trim()?JSON.parse(body):null;
}
const statuses=id=>api(`deployments/${id}/statuses`);
const settled=state=>state==='success'||state==='inactive';
const pagesDone=sha=>api(`pages/deployments/${sha}`)?.status==='succeed';
function validate(record){
 if(!Number.isSafeInteger(record.id)||record.id<=0||record.environment!=='github-pages'||!/^[a-f0-9]{40}$/.test(record.sha)||record.sha===head)throw Error('Refusing a current or invalid deployment record.');
}
function validateRun(run){
 if(!Number.isSafeInteger(run?.id)||run.status!=='completed'||run.conclusion!=='success'||!/^[a-f0-9]{40}$/.test(run.head_sha)||run.head_sha===head)throw Error('Refusing an active or current publisher.');
}
if(process.argv[2]==='plan'){
 mkdirSync(folder,{recursive:true});let plan=null;
 for(const record of api('deployments?environment=github-pages&per_page=100')){
  if(record.sha===head)continue;
  const history=statuses(record.id);
  if(!settled(history[0]?.state))continue;
  validate(record);
  if(!pagesDone(record.sha))continue;
  // A second publisher using the same old revision must also be finished.
  const siblings=api(`deployments?sha=${record.sha}&environment=github-pages&per_page=100`);
  if(siblings.some(other=>!['success','inactive','failure','error'].includes(statuses(other.id)[0]?.state)))continue;
  plan={repository:repo,current_sha:head,record,statuses:history,pages_state:'succeed'};break;
 }
 // A previous repair may have removed the generic record without releasing
 // Pages itself. Only a confirmed successful, completed publisher can supply
 // that orphaned Pages ID; never guess it from an arbitrary revision.
 if(!plan){
  const runs=api('actions/workflows/pages.yml/runs?status=success&branch=main&per_page=20').workflow_runs;
  for(const run of runs){
   if(run.head_sha===head||run.status!=='completed'||run.conclusion!=='success')continue;
   validateRun(run);if(!pagesDone(run.head_sha))continue;
   const records=api(`deployments?sha=${run.head_sha}&environment=github-pages&per_page=100`);
   if(records.length)continue;
   plan={repository:repo,current_sha:head,record:null,run,pages_state:'succeed'};break;
  }
 }
 writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`found=${Boolean(plan)}\n`);
 console.log(plan?`Backed up completed prior publication ${plan.record?.id||plan.run.id} (${plan.record?.sha||plan.run.head_sha}).`:'No completed prior Pages record needs repair.');
}else if(process.argv[2]==='apply'){
 // The workflow supplies this only after upload-artifact succeeds. A local
 // backup alone is not enough to remove historical deployment metadata.
 if(!/^\d+$/.test(process.env.PAGES_LOCK_ARCHIVE_ID||''))throw Error('A successful remote backup is required before repair.');
 const plan=JSON.parse(readFileSync(file,'utf8'));
 if(!plan||plan.repository!==repo||plan.current_sha!==head)throw Error('Backup does not match this publisher.');
 if(plan.pages_state!=='succeed')throw Error('Backup does not describe a completed publication.');
 let sha;
 if(plan.record){
  validate(plan.record);
  if(!settled(plan.statuses[0]?.state))throw Error('Backup does not describe a completed deployment.');
  const live=api(`deployments/${plan.record.id}`);validate(live);
  if(live.sha!==plan.record.sha||!settled(statuses(live.id)[0]?.state))throw Error('Prior deployment changed; refusing repair.');
  sha=live.sha;
 }else{
  validateRun(plan.run);const run=api(`actions/runs/${plan.run.id}`);validateRun(run);
  if(run.head_sha!==plan.run.head_sha)throw Error('Prior publisher changed.');sha=run.head_sha;
 }
 if(!pagesDone(sha))throw Error('Prior Pages publication changed; refusing repair.');
 const siblings=api(`deployments?sha=${sha}&environment=github-pages&per_page=100`);
 if(siblings.some(other=>!['success','inactive','failure','error'].includes(statuses(other.id)[0]?.state)))throw Error('Another publisher of the prior revision is still active.');
 if(plan.record){
  const id=plan.record.id;
  if(statuses(id)[0]?.state!=='inactive')api(`deployments/${id}/statuses`,'POST',{state:'inactive',description:'Completed prior Pages publication archived before releasing its stale lock.'});
  if(statuses(id)[0]?.state!=='inactive')throw Error('Deployment did not become inactive.');
  api(`deployments/${id}`,'DELETE');
 }else if(siblings.length)throw Error('Prior deployment records appeared after backup.');
 try{
  api(`pages/deployments/${sha}/cancel`,'POST');
  console.log(`Cancelled obsolete Pages lock ${sha}; backup artifact ${process.env.PAGES_LOCK_ARCHIVE_ID}.`);
 }catch(error){
  let response;try{response=JSON.parse(error.stdout);}catch{}
  if(String(response?.status)!=='400'||!response.message?.includes("as it's finished")||!pagesDone(sha))throw error;
  // This is the documented terminal state, not a failed new publication.
  // Let the actual publisher verify whether the obsolete lease is released.
  console.log(`Pages confirms ${sha} is already finished; prior metadata is archived. Proceeding to the real publisher.`);
 }
}else throw Error('Expected plan or apply.');
