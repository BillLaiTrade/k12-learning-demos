import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,appendFileSync} from 'node:fs';
import {join} from 'node:path';

const repo=process.env.GITHUB_REPOSITORY,head=process.env.GITHUB_SHA;
const folder=process.env.PAGES_LOCK_DIR;
if(!/^[\w.-]+\/[\w.-]+$/.test(repo||'')||!/^[a-f0-9]{40}$/.test(head||'')||!folder)throw Error('Missing valid repository, revision or backup directory.');
const prefix=`repos/${repo}/`,file=join(folder,'completed-deployment.json');
function api(path,method='GET',fields={}){
 const args=['api',prefix+path];
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
 writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,`found=${Boolean(plan)}\n`);
 console.log(plan?`Backed up completed prior deployment ${plan.record.id} (${plan.record.sha}).`:'No completed prior Pages record needs repair.');
}else if(process.argv[2]==='apply'){
 // The workflow supplies this only after upload-artifact succeeds. A local
 // backup alone is not enough to remove historical deployment metadata.
 if(!/^\d+$/.test(process.env.PAGES_LOCK_ARCHIVE_ID||''))throw Error('A successful remote backup is required before repair.');
 const plan=JSON.parse(readFileSync(file,'utf8'));
 if(!plan||plan.repository!==repo||plan.current_sha!==head)throw Error('Backup does not match this publisher.');
 validate(plan.record);
 if(!settled(plan.statuses[0]?.state)||plan.pages_state!=='succeed')throw Error('Backup does not describe a completed publication.');
 const live=api(`deployments/${plan.record.id}`);validate(live);
 if(live.sha!==plan.record.sha||!settled(statuses(live.id)[0]?.state)||!pagesDone(live.sha))throw Error('Prior deployment changed; refusing repair.');
 const siblings=api(`deployments?sha=${live.sha}&environment=github-pages&per_page=100`);
 if(siblings.some(other=>!['success','inactive','failure','error'].includes(statuses(other.id)[0]?.state)))throw Error('Another publisher of the prior revision is still active.');
 if(statuses(live.id)[0]?.state!=='inactive')api(`deployments/${live.id}/statuses`,'POST',{state:'inactive',description:'Completed prior Pages publication archived before releasing its stale lock.'});
 if(statuses(live.id)[0]?.state!=='inactive')throw Error('Deployment did not become inactive.');
 api(`deployments/${live.id}`,'DELETE');
 console.log(`Released obsolete deployment record ${live.id}; backup artifact ${process.env.PAGES_LOCK_ARCHIVE_ID}.`);
}else throw Error('Expected plan or apply.');
