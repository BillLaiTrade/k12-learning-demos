// Photographic apparatus uses the 5.3 bench as its visual reference. Only the
// original lesson controllers advance state; the image layer owns no clock.
const asset=name=>new URL(name,import.meta.url).href;
const iceImage=asset('ice-cube-photo.webp');
const number=value=>value.toFixed(1);

function iceCubes(grams,surface,bath=false){
 if(grams<=0)return '';
 const scale=Math.cbrt(grams/50),size=(bath?67:98)*scale;
 return [0,1,2,3].map(i=>{
  const cx=(bath?397:425)+(i%2)*(bath?90:132),cy=surface+(i<2?-5:12);
  return `<image class="photo-ice" href="${iceImage}" x="${cx-size/2}" y="${cy-size*.18}" width="${size}" height="${size}" opacity="${i<2?.86:1}"/>`;
 }).join('');
}

export function heatingPhotoState(state){
 const surface=600-160*(state.water+state.ice)/100;
 return {surface,probeTip:536,iceScale:Math.cbrt(state.ice/50)};
}

export function heatingPhotoFrame(state,energy){
 const {surface}=heatingPhotoState(state),boiling=state.vapor>0;
 const bubbles=boiling?Array.from({length:13},(_,i)=>{
  const phase=(energy/2600+i*.137)%1,cx=400+(i*47)%200,cy=585-phase*(585-surface-9);
  return `<circle cx="${cx}" cy="${cy}" r="${3+i%3*1.5}" fill="#f7ffff" fill-opacity=".45" stroke="#fffef5" stroke-opacity=".9" stroke-width="1.5"/>`;
 }).join(''):'';
 return `<g class="photo-sample" data-ice-grams="${state.ice}" data-surface="${surface}" clip-path="url(#heat-photo-liquid)">
 <path d="M382 ${surface}Q500 ${surface-17} 619 ${surface}V585Q500 615 382 585Z" fill="url(#heat-photo-water)"/>
 <ellipse class="photo-waterline" cx="500" cy="${surface}" rx="118" ry="15" fill="#ecf7ed" fill-opacity=".12" stroke="#e2f2f0" stroke-width="3"/>
 ${iceCubes(state.ice,surface)}${bubbles}
 <path d="M389 ${surface+18}V580M609 ${surface+12}V581" stroke="#fffef5" stroke-opacity=".35" stroke-width="3"/>
 </g>
 ${state.temperature===100?'<ellipse class="photo-water-reference" cx="500" cy="440" rx="121" ry="16" fill="none" stroke="#9d652e" stroke-width="3" stroke-dasharray="11 9"/>':''}`;
}

function bathPhotoFrame(state,prefix){
 const surface=510;
 return `<g class="photo-sample" data-ice-grams="${state.ice}" clip-path="url(#${prefix}-liquid)">
 <path d="M365 ${surface}Q442 498 522 ${surface}V664Q443 687 365 664Z" fill="url(#${prefix}-water)"/>
 <ellipse cx="443" cy="${surface}" rx="78" ry="12" fill="#eff9ee" fill-opacity=".12" stroke="#dae9e3" stroke-width="2.5"/>
 ${iceCubes(state.ice,surface,true)}
 <path d="M371 526V656M516 526V657" stroke="#fffef6" stroke-opacity=".35" stroke-width="2"/>
 </g>`;
}

function mountPhoto(host,kind){
 const bath=kind!=='heat',prefix=bath?'bath-photo-'+kind:'heat-photo';
 const file=bath?'phase-bath-photo.webp':'heating-bench-photo.webp';
 const view=document.createElement('div');view.className='photo-apparatus-view';
 view.innerHTML=`<svg viewBox="0 0 1048 941" aria-hidden="true"><defs>
 <clipPath id="${prefix}-liquid"><path d="${bath?'M364 420H523V665Q443 691 364 665Z':'M381 350H620V587Q500 617 381 587Z'}"/></clipPath>
 <linearGradient id="${prefix}-water" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#8fb4b6" stop-opacity=".1"/><stop offset=".24" stop-color="#e9f5ed" stop-opacity=".13"/><stop offset=".7" stop-color="#abc7c8" stop-opacity=".12"/><stop offset="1" stop-color="#a6c2c7" stop-opacity=".25"/></linearGradient>
 </defs><image class="photo-base" href="${asset(file)}" width="1672" height="941"/><g class="photo-dynamic"></g>
 ${bath?`<g class="photo-lcd" fill="#233722" font-family="ui-monospace,monospace" font-size="33" font-weight="700"><text x="886" y="590" text-anchor="middle" class="photo-sample-reading"></text><text x="886" y="637" text-anchor="middle" class="photo-bath-reading"></text></g>
 <g fill="#fffaf0" stroke="#eadcc3" stroke-width="1"><rect x="361" y="363" width="143" height="37" rx="8"/><rect x="552" y="415" width="131" height="37" rx="8"/></g><g fill="#38523d" font-family="sans-serif" font-size="25" text-anchor="middle"><text x="432" y="390">杯內探針</text><text x="617" y="442">外浴探針</text></g>`:
 '<text class="photo-lcd photo-temperature" x="870" y="621" text-anchor="middle" fill="#233722" font-family="ui-monospace,monospace" font-weight="700" font-size="46"></text><circle class="photo-heater-light" cx="431" cy="750" r="8" fill="#244b2c"/>'}
 </svg>`;
 host.append(view);
 const image=new Image();let loaded=false,iceLoaded=false;
 const ready=()=>{if(loaded&&iceLoaded)host.classList.add('has-photo');};
 image.onload=()=>{loaded=true;ready();};image.onerror=()=>host.classList.remove('has-photo');image.src=asset(file);
 const ice=new Image();ice.onload=()=>{iceLoaded=true;ready();};ice.onerror=()=>host.classList.remove('has-photo');ice.src=iceImage;
 return {view,prefix};
}

export function createPhotoHeating(host){
 const {view}=mountPhoto(host,'heat');
 host.querySelector('#heat-transfer').innerHTML='<svg viewBox="0 0 1048 941" role="img" aria-label="熱由加熱盤經杯底傳入樣品"><defs><marker id="photo-heating-arrow" markerWidth="16" markerHeight="16" refX="13" refY="8" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L16 8L0 16Z" fill="#bc692e" stroke="#fff8e8" stroke-width="1.5"/></marker></defs><path d="M468 632V542" stroke="#fff8e8" stroke-width="12"/><path d="M468 632V542" stroke="#bc692e" stroke-width="7" marker-end="url(#photo-heating-arrow)"/><text x="452" y="558" text-anchor="end" font-size="29" font-weight="700" fill="#9e5223" stroke="#fff8e8" stroke-width="5" paint-order="stroke">熱傳入</text></svg>';
 return {update(state,playing,energy){
  view.querySelector('.photo-dynamic').innerHTML=heatingPhotoFrame(state,energy);
  view.querySelector('.photo-temperature').textContent=number(state.temperature)+'°C';
  view.querySelector('.photo-heater-light').setAttribute('fill',playing?'#aeed6f':'#244b2c');
 }};
}

export function createPhotoBath(host,key){
 const {view,prefix}=mountPhoto(host,key),arrow=host.querySelector('.comparison-arrow');
 const inward=key==='warm',marker=prefix+'-arrow';
 arrow.innerHTML=`<svg viewBox="0 0 1048 941" role="img" aria-label="${inward?'熱由外浴穿過杯壁傳入樣品':'熱由樣品穿過杯壁傳出至外浴'}"><defs><marker id="${marker}" markerWidth="18" markerHeight="18" refX="15" refY="9" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L18 9L0 18Z" fill="#bc692e" stroke="#fff9ed" stroke-width="1.5"/></marker></defs><path d="${inward?'M275 608H405':'M478 608H569'}" stroke="#fff9ed" stroke-width="13"/><path d="${inward?'M275 608H405':'M478 608H569'}" stroke="#bc692e" stroke-width="8" marker-end="url(#${marker})"/><text x="${inward?318:536}" y="582" text-anchor="middle" font-size="30" font-weight="700" fill="#9e5223" stroke="#fff9ed" stroke-width="5" paint-order="stroke">${inward?'熱傳入':'熱傳出'}</text></svg>`;
 return {update(state){
  view.querySelector('.photo-dynamic').innerHTML=bathPhotoFrame(state,prefix);
  view.querySelector('.photo-sample-reading').textContent='杯內 '+number(state.sampleTemperature)+'°C';
  view.querySelector('.photo-bath-reading').textContent='外浴 '+number(state.bathTemperature)+'°C';
 }};
}
