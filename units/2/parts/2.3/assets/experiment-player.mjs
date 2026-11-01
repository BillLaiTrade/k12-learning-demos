// The same controls and description follow each scene without being recreated.
export function createExperimentPlayerFooter(panel) {
  const views=[...panel.querySelectorAll('[data-step-panel],[data-co2-panel]')];
  const controls=panel.querySelector('.oxygen-sequence-controls,.co2-sequence-controls');
  const footer=document.createElement('div');
  footer.className='experiment-player-footer';
  controls.classList.add('experiment-playback-controls');
  controls.querySelector('[data-play]').classList.add('experiment-play-button');
  footer.append(controls);
  // A phone close-up is supplementary; it must not separate the main picture
  // from its playback bar or push that bar down when playback begins.
  for(const view of views){
    const closeup=view.querySelector('.oxygen-mobile-zoom,.co2-closeup');
    if(closeup){closeup.classList.add('experiment-closeup-view');view.querySelector('figure').after(closeup);}
  }
  function show(view){const figure=view.querySelector('figure');if(footer.parentElement!==figure)figure.append(footer);}
  show(views[0]);
  return {element:footer,show};
}
