// Explicit playback brings its evidence and controls back into view. Automatic
// resuming never scrolls the reader away from their current place.
export function experimentVisible(stage){
  const box=stage.getBoundingClientRect();
  return box.bottom>0&&box.top<innerHeight&&box.width>0&&box.height>0;
}

export function revealExperiment(stage,controls){
  const box=stage.getBoundingClientRect(),deck=controls?.getBoundingClientRect()||box;
  const route=document.querySelector('.route');
  const inset=innerWidth<=760&&route?route.getBoundingClientRect().height+8:8;
  const height=Math.min(innerHeight,window.visualViewport?.height||innerHeight);
  if(box.top>=inset&&Math.max(box.bottom,deck.bottom)<=height-8)return;
  scrollTo({top:Math.max(0,scrollY+box.top-inset),behavior:'instant'});
}
