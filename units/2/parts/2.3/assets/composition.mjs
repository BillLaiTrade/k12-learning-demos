import {createParticles} from './composition-particles-model.mjs?v=particles-motion-2';
const section = document.querySelector('#s2');
const controls = [...section.querySelectorAll('[data-air-gas]')];
const viewControls = [...section.querySelectorAll('[data-air-view]')];
const shares = [...section.querySelectorAll('.air-share')];
const panel = section.querySelector('.air-composition-panel');
const minor = section.querySelector('[data-component="minor"]');
const detail = section.querySelector('.air-other-detail');
const connectorElement = section.querySelector('.air-zoom-link');
const connector = connectorElement.querySelector('path');
const detailTriggers = [...section.querySelectorAll('[aria-controls~="air-minor-detail"]')];
const knowledge = section.querySelector('#air-gas-knowledge');
const profiles = [...knowledge.querySelectorAll('[data-gas-profile]')];
function showKnowledge(gas) {
  knowledge.hidden = gas === 'all';
  for (const profile of profiles) profile.hidden = profile.dataset.gasProfile !== gas;
  knowledge.dataset.knowledgeCurrent = gas;
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selected = 'all';
let focused = null;
let hovered = null;
let connectorFrame = 0;
function emphasize() {
  section.dataset.emphasis = selected !== 'all' ? selected : hovered || focused || selected;
}
function updateConnector() {
  if (detail.hidden) return;
  const p = panel.getBoundingClientRect();
  const target=section.dataset.arrangement==='mixed'?section.querySelector(`.air-particle-scene[data-particle-field=main] .air-particle[data-gas="${selected==='other'?'other':'argon'}"]`):minor;
  const m = target.getBoundingClientRect();
  const d = detail.getBoundingClientRect();
  const x = m.left + m.width / 2 - p.left;
  const y = m.bottom - p.top + 3;
  connector.setAttribute('d', `M ${x} ${y} V ${d.top - p.top}`);
}
function followConnector() {
  cancelAnimationFrame(connectorFrame);
  const until = performance.now() + (reducedMotion.matches ? 0 : 420);
  const step = () => {
    updateConnector();
    if (performance.now() < until) connectorFrame = requestAnimationFrame(step);
  };
  connectorFrame = requestAnimationFrame(step);
}
function choose(gas, sourceShare) {
  selected = gas;
  hovered = null;
  focused = gas;
  for (const control of controls) {
    const active = control.dataset.airGas === gas || (gas === 'minor' && ['argon', 'other'].includes(control.dataset.airGas));
    control.setAttribute('aria-pressed', String(active));
  }
  for (const share of shares) {
    const active = share.dataset.component === gas || (share.dataset.component === 'minor' && ['argon', 'other'].includes(gas));
    share.setAttribute('aria-pressed', String(active));
  }
  const target = sourceShare || shares.find(share => share.dataset.component === (['argon', 'other'].includes(gas) ? 'minor' : gas));
  if (target) for (const share of shares) share.tabIndex = share === target ? 0 : -1;
  const expanded = ['minor', 'argon', 'other'].includes(gas);
  detail.hidden = !expanded;
  connectorElement.toggleAttribute('hidden', !expanded);
  for (const trigger of detailTriggers) trigger.setAttribute('aria-expanded', String(expanded));
  showKnowledge(gas); emphasize(); followConnector();
}
for (const button of controls) {
  button.disabled = false;
  button.addEventListener('click', () => choose(button.dataset.airGas));
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = button.dataset.airGas; emphasize();
  });
  button.addEventListener('pointerleave', () => { hovered = null; emphasize(); });
  button.addEventListener('focus', () => { focused = button.dataset.airGas; emphasize(); });
  button.addEventListener('blur', () => { focused = null; emphasize(); });
}
for (const button of section.querySelectorAll('[data-knowledge-gas]')) {
  button.disabled = false;
  button.addEventListener('click', () => {
    choose(button.dataset.knowledgeGas);
    // The chooser article is now hidden; keep focus on the equivalent visible legend.
    controls.find(control => control.dataset.airGas === button.dataset.knowledgeGas).focus({ preventScroll: true });
  });
}
for (const [index, share] of shares.entries()) {
  share.removeAttribute('aria-disabled');
  share.addEventListener('click', () => choose(share.dataset.component, share));
  share.addEventListener('focus', () => { focused = share.dataset.component; emphasize(); });
  share.addEventListener('blur', () => { focused = null; emphasize(); });
  share.addEventListener('keydown', event => {
    if(['Enter',' '].includes(event.key)){event.preventDefault();choose(share.dataset.component,share);return;}
    const delta={ArrowLeft:-1,ArrowUp:-1,ArrowRight:1,ArrowDown:1};
    if(!(event.key in delta)&&!['Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?shares.length-1:(index+delta[event.key]+shares.length)%shares.length;
    shares.forEach((s,i)=>s.tabIndex=i===next?0:-1);shares[next].focus({preventScroll:true});
  });
}
for (const button of viewControls) {
  button.disabled = false;
  button.addEventListener('click', () => {
    section.dataset.arrangement = button.dataset.airView;
    fields[0].model.setMode(button.dataset.airView,{immediate:reducedMotion.matches||userPaused});renderParticles();syncMotion();
    for (const control of viewControls) control.setAttribute('aria-pressed', String(control === button));
    hovered = null; focused = null;
    emphasize(); followConnector();
  });
}
// Clicking away dismisses the selection without consuming the other action.
document.addEventListener('click', event => {
  const control = event.target.closest('.air-share, .air-particle, [data-air-gas], [data-air-view], [data-air-motion]');
  if ((control && section.contains(control)) || detail.contains(event.target) || knowledge.contains(event.target)) return;
  if (selected !== 'all' || section.dataset.emphasis !== 'all') choose('all');
});
section.addEventListener('keydown', event => {
  if (event.key === 'Escape' && selected !== 'all') {
    event.preventDefault();
    if (knowledge.contains(document.activeElement)) {
      const target = controls.find(control => control.dataset.airGas === selected) || shares.find(share => share.dataset.component === selected);
      target?.focus({ preventScroll: true });
    }
    choose('all');
  }
});
new ResizeObserver(followConnector).observe(panel);
const fields=[...section.querySelectorAll('[data-particle-field]')].map(svg=>({svg,model:createParticles({detail:svg.dataset.particleField==='detail'}),nodes:[...svg.querySelectorAll('[data-particle]')],trails:[...svg.querySelectorAll('[data-trail]')]}));
const motionButton=section.querySelector('[data-air-motion]');let userPaused=false,visible=false,motionFrame=0,previousTime=0;
function renderParticles(){
 for(const field of fields){
  field.nodes.forEach((node,i)=>{const p=field.model.particles[i];node.setAttribute('cx',p.x.toFixed(3));node.setAttribute('cy',p.y.toFixed(3));});
  field.trails.forEach(node=>{const p=field.model.particles[+node.dataset.trail],speed=Math.hypot(p.vx,p.vy)||1,dx=p.vx/speed,dy=p.vy/speed;node.setAttribute('d',`M${p.x-dx*1.8} ${p.y-dy*1.8}Q${p.x-dx*.8-dy*.25} ${p.y-dy*.8+dx*.25} ${p.x} ${p.y}`);});
  field.svg.dataset.regrouping=String(field.model.regrouping);
 }
 updateConnector();
}
function tickParticles(time){
 motionFrame=0;const dt=previousTime?Math.min(.035,(time-previousTime)/1000):0;previousTime=time;
 const step=dt*(reducedMotion.matches ? .4 : 1);fields[0].model.step(step);if(!detail.hidden)fields[1].model.step(step);renderParticles();motionFrame=requestAnimationFrame(tickParticles);
}
function syncMotion(){
 const running=visible&&!document.hidden&&!userPaused;
 section.dataset.particleMotion=running?'running':userPaused?'paused':document.hidden?'hidden':'offscreen';
 section.dataset.particleReduced=String(reducedMotion.matches);motionButton.hidden=false;motionButton.textContent=userPaused?'繼續粒子':'暫停粒子';motionButton.setAttribute('aria-pressed',String(userPaused));
 if(!running){cancelAnimationFrame(motionFrame);motionFrame=0;previousTime=0;}else if(!motionFrame){previousTime=0;motionFrame=requestAnimationFrame(tickParticles);}
}
motionButton.addEventListener('click',()=>{userPaused=!userPaused;syncMotion();});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){fields[0].model.setMode(section.dataset.arrangement,{immediate:true});renderParticles();}syncMotion();});
document.addEventListener('visibilitychange',syncMotion);
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion();},{rootMargin:'100px'}).observe(panel);else visible=true;
for(const field of fields)field.svg.addEventListener('click',event=>{const particle=event.target.closest('[data-particle]');if(particle)choose(particle.dataset.gas);});
renderParticles();syncMotion();
choose('all');
section.querySelector('.air-knowledge-hint').hidden = false;
updateConnector();
const links = [...document.querySelectorAll('.route a[href^="#"]')];
const sections = links.map(link => document.querySelector(link.getAttribute('href')));
let pending = false;
function updateRoute() {
  pending = false;
  const position = innerHeight * .35;
  const active = sections.reduce((current, element) => element.getBoundingClientRect().top <= position ? element : current, sections[0]);
  for (const link of links) {
    if (link.getAttribute('href') === '#' + active.id) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
}
addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateRoute); } }, { passive: true });
addEventListener('resize', updateRoute);
updateRoute();
