// Reserve space for the fixed screen view without changing optical conditions.
export function createImagingWorkspace(root){
 const stage=root.querySelector('.imaging-stage'),dock=root.querySelector('.imaging-hud-dock'),panel=root.querySelector('.imaging-preview'),tools=root.querySelector('.imaging-tools');
 function layout(){const width=stage.clientWidth;root.dataset.compact=String(width<1000);root.dataset.narrow=String(width<600);root.style.setProperty('--hud-dock-height',dock.offsetHeight+'px');const nav=document.querySelector('.route'),navHeight=innerWidth<=760&&nav?nav.offsetHeight:0;root.style.setProperty('--imaging-window-height',Math.max(280,innerHeight-navHeight-24)+'px');root.style.setProperty('--preview-paper-width',Math.min(panel.clientWidth-14,Math.max(38,(stage.clientHeight-116)*380/600))+'px');}
 new ResizeObserver(layout).observe(stage);new ResizeObserver(layout).observe(dock);window.addEventListener('resize',layout);
 layout();root.dataset.hudReady='true';
 return {start:layout,safeRect(){const width=stage.clientWidth,height=stage.clientHeight,top=Math.max(96,tools.offsetTop+tools.offsetHeight+10);return {left:12,top,width:Math.max(60,width-panel.offsetWidth-40),height:Math.max(60,height-top-44)};}};
}
