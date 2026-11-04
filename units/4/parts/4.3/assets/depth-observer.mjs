import { TANK, observerCamera, cameraDirection, traceViewRay } from './depth-model.mjs?v=20261104-finish1';

export function createTextures(photo) {
  const texture = (sx, sy, sw, sh, width = 256, height = 128) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (photo) ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, width, height);
    else { ctx.fillStyle = '#c18c52'; ctx.fillRect(0, 0, width, height); }
    return { data: ctx.getImageData(0, 0, width, height).data, width, height };
  };
  const coin = document.createElement('canvas'); coin.width = coin.height = 256;
  const c = coin.getContext('2d', { willReadFrequently: true });
  const gradient = c.createLinearGradient(20, 0, 220, 256);
  gradient.addColorStop(0, '#fbe5a7'); gradient.addColorStop(.3, '#cb8c45'); gradient.addColorStop(.55, '#f5d088'); gradient.addColorStop(1, '#94542b');
  c.fillStyle = gradient; c.fillRect(0, 0, 256, 256);
  for (const [r, color, width] of [[123, '#6c431f', 3], [119, '#ffe8b5', 2], [111, '#915f30', 3], [106, '#f5d59b', 2]]) {
    c.beginPath(); c.arc(128, 128, r, 0, Math.PI * 2); c.strokeStyle = color; c.lineWidth = width; c.stroke();
  }
  for (let a = 0; a < 360; a += 6) {
    const x = Math.cos(a * Math.PI / 180), y = Math.sin(a * Math.PI / 180);
    c.beginPath(); c.moveTo(128 + 114 * x, 128 + 114 * y); c.lineTo(128 + 120 * x, 128 + 120 * y); c.strokeStyle = '#fff0bf'; c.lineWidth = 2; c.stroke();
  }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 100px serif';
  c.shadowColor = '#5b301c'; c.shadowOffsetX = 2; c.shadowOffsetY = 2; c.shadowBlur = 1;
  c.fillStyle = '#f9daa0'; c.fillText('1', 128, 120); c.shadowBlur = 0; c.shadowOffsetX = c.shadowOffsetY = 0;
  c.font = '22px serif'; c.fillText('光 的 探 索', 128, 185);
  return { wood: texture(350, 320, 550, 180, 512, 256), water: texture(270, 620, 700, 210, 512, 256),
    metal: texture(154, 330, 54, 390, 64, 256),
    coin: { data: c.getImageData(0, 0, 256, 256).data, width: 256, height: 256 } };
}

const sample = (t, u, v) => {
  const x = ((Math.floor(u * t.width) % t.width) + t.width) % t.width;
  const y = ((Math.floor(v * t.height) % t.height) + t.height) % t.height;
  const i = (y * t.width + x) * 4;
  return [t.data[i], t.data[i + 1], t.data[i + 2]];
};

const mix = (a,b,t) => a.map((v,i) => v*(1-t)+b[i]*t);
const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const light = [-.32,.86,.40];
const norm = v => {const d=Math.hypot(...v);return v.map(x=>x/d);};

// Real surface normals, a shared light, textured frames and contact shadows.
// These change only the finish: the coin still comes from traceViewRay hits.
export function renderObserver(canvas, geometry, textures, {preview=false}={}) {
  const quality = preview ? 1 : 1.55;
  const width = Math.max(400, Math.min(preview?560:850, Math.round(canvas.clientWidth * quality)));
  const height = Math.round(width * 500 / 720);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  const frame = ctx.createImageData(width, height), pixels = frame.data;
  const camera = observerCamera(geometry, width / height), L=TANK.length,Z=TANK.width/2,H=TANK.height;
  let coinPixels = 0, minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const direction = cameraDirection(camera, 2 * (x + .5) / width - 1, 1 - 2 * (y + .5) / height);
    const hit = traceViewRay(geometry, camera.origin, direction);
    let color;
    if (!hit) {
      const t=(-4-camera.origin[1])/direction[1];
      const tx=camera.origin[0]+direction[0]*t,tz=direction[2]*t;
      color=sample(textures.wood,tz/180,tx/280);
      const dx=Math.max(0,-tx,tx-L-9),dz=Math.max(0,Math.abs(tz+3)-Z-7);
      const shadow=1-.38*Math.exp(-(dx*dx+dz*dz)/160);
      color=color.map(v=>v*shadow);
    } else {
      const p=hit.point,n=hit.normal||[0,1,0],view=direction.map(v=>-v);
      const diffuse=.53+.47*Math.max(0,dot(n,light));
      const half=norm([view[0]+light[0],view[1]+light[1],view[2]+light[2]]);
      const spec=Math.pow(Math.max(0,dot(n,half)),45);
      if(hit.kind==='rim') {
        const edge=Math.min(p[0],L-p[0],Z-Math.abs(p[2]));
        const bevel=.62+.38*Math.sin(Math.PI*Math.max(0,Math.min(1,edge/TANK.rim)));
        const metal=sample(textures.metal,edge/TANK.rim,p[0]/140+p[2]/100);
        color=metal.map((v,i)=>(v*.62+[102,109,103][i])*bevel+spec*125);
        if(edge<.20||edge>TANK.rim-.20)color=mix(color,[232,243,224],.75);
      } else if(hit.kind==='outside') {
        const faceU=hit.face==='end'?(p[2]+Z)/TANK.width:p[0]/L;
        const edge=Math.min(faceU,1-faceU),h=p[1]/H;
        const grain=sample(textures.wood,faceU*1.3,h*.32);
        // A dark, bronze-backed wall is visibly opaque, not a featureless teal block.
        color=mix(grain,[51,65,54],.40).map(v=>v*(.78+.22*h)*(.72+.28*Math.max(0,dot(n,light))));
        const reflection=Math.exp(-(((faceU-.24)/.045)**2))*.11+Math.exp(-(((faceU-.80)/.035)**2))*.06;
        color=mix(color,[222,234,205],reflection);
        if(edge<.025||p[1]<4||p[1]>H-4) {
          const t=edge<.025?edge/.025:p[1]>H-4?(H-p[1])/4:p[1]/4;
          const shine=.6+.6*Math.sin(t*Math.PI);
          const metal=sample(textures.metal,t,p[1]/180);
          color=metal.map((v,i)=>(v*.8+[26,33,29][i])*shine*diffuse+spec*130);
          if(t<.08||t>.92)color=mix(color,[209,225,208],.65);
        }
        // Small recessed fasteners anchor the corner rails to the apparatus.
        for(const railU of [.013,.987])for(const railH of [.11,.88]) {
          const d=Math.hypot((faceU-railU)*130,(h-railH)*110);
          if(d<1.7){const f=Math.sqrt(Math.max(0,1-d*d/2.89));color=[45+155*f,51+158*f,47+148*f];if(Math.abs((faceU-railU)*130+(h-railH)*110)<.18)color=[36,40,34];}
        }
      } else {
        if(hit.kind==='coin') {
          const u=(p[2]/TANK.coinRadius+1)/2,v=(p[0]-TANK.coinX+TANK.coinRadius)/(2*TANK.coinRadius);
          color=sample(textures.coin,u,v).map(v=>v*diffuse+spec*65);
          coinPixels++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
        } else {
          const u=hit.kind==='floor'?p[2]/160:p[2]/120+p[0]/160;
          const v=hit.kind==='floor'?p[0]/220:p[1]/180;
          color=sample(textures.wood,u,v).map(v=>v*diffuse*(hit.kind==='wall'?.76:1));
          const edge=Math.min(p[0],L-p[0],Z-Math.abs(p[2]));
          const contact=hit.kind==='floor'?1-.35*Math.exp(-Math.max(0,edge)/7):1-.30*Math.exp(-Math.max(0,p[1])/7);
          color=color.map(v=>v*contact);
          if(hit.kind==='wall'&&Math.min(p[0],L-p[0],Z-Math.abs(p[2]))<1)color=mix(color,[151,181,159],.18);
        }
        if(hit.wet) {
          const caustic=sample(textures.water,p[2]/180+.2,p[0]/210+p[1]/140);
          color=mix(color,caustic,hit.kind==='coin'?.06:hit.kind==='floor'?.53:.32);
          color[0]*=Math.exp(-hit.distance*.0015);color[1]*=Math.exp(-hit.distance*.00025);color[2]+=6;
          // A narrow meniscus joins the water to the wall; the fill itself stays planar.
          if(hit.kind==='wall'&&Math.abs(p[1]-geometry.depth)<1.3)color=mix(color,[191,249,243],.55);
        }
      }
    }
    const vignette=1-.065*((x/width-.5)**2+(y/height-.5)**2);
    const i=(y*width+x)*4;
    pixels[i]=color[0]*vignette;pixels[i+1]=color[1]*vignette;pixels[i+2]=color[2]*vignette;pixels[i+3]=255;
  }
  ctx.putImageData(frame,0,0);
  const bounds=coinPixels?{x:minX/width,y:minY/height,width:(maxX-minX+1)/width,height:(maxY-minY+1)/height}:null;
  return {coinPixels,bounds,width,height};
}
