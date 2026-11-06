import {PROJECTOR as G,projectorState} from './projector-optics.mjs';

export function drawHouse(ctx){
 ctx.fillStyle='#e9d5a9';ctx.fillRect(-.42,-.11,.84,.69);
 ctx.strokeStyle='#ad9975';ctx.lineWidth=.014;ctx.strokeRect(-.42,-.11,.84,.69);
 ctx.fillStyle='#c96950';ctx.beginPath();ctx.moveTo(-.49,-.10);ctx.lineTo(0,-.67);ctx.lineTo(.49,-.10);ctx.closePath();ctx.fill();
 ctx.fillStyle='#4c83a0';ctx.fillRect(-.29,.20,.21,.38);ctx.strokeStyle='#396782';ctx.lineWidth=.012;ctx.strokeRect(-.29,.20,.21,.38);
 ctx.fillStyle='#d6b36c';ctx.beginPath();ctx.arc(-.12,.4,.014,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d8edf0';ctx.fillRect(.13,.07,.23,.24);ctx.strokeStyle='#557b7a';ctx.lineWidth=.024;ctx.strokeRect(.13,.07,.23,.24);ctx.beginPath();ctx.moveTo(.245,.07);ctx.lineTo(.245,.31);ctx.moveTo(.13,.19);ctx.lineTo(.36,.19);ctx.stroke();
}
export function paintCard(canvas,state){
 const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(canvas.width/2,canvas.height/2);c.scale(canvas.width/1.5,canvas.height/1.65);if(state.flipped)c.rotate(Math.PI);drawHouse(c);c.restore();
}
export function paintProjector(canvas,state){
 const c=canvas.getContext('2d'),g=projectorState(state),px=canvas.width/G.paperWidth,py=canvas.height/G.paperHeight;
 c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#fffcf0';c.fillRect(0,0,canvas.width,canvas.height);
 const glow=c.createRadialGradient(canvas.width*.48,canvas.height*.44,15,canvas.width/2,canvas.height/2,canvas.width*.7);glow.addColorStop(0,'#fffef7');glow.addColorStop(1,'#f0ead8');c.fillStyle=glow;c.fillRect(0,0,canvas.width,canvas.height);
 c.save();c.translate(canvas.width/2,canvas.height/2);
 // Gaussian approximation of the finite aperture's defocus footprint.
 c.filter=`blur(${Math.min(canvas.width*.32,g.spread*px*.48)}px)`;
 c.scale(-g.scale*px,-g.scale*py);if(state.flipped)c.rotate(Math.PI);drawHouse(c);c.restore();
 c.save();c.translate(canvas.width/2,canvas.height/2);c.strokeStyle='#b28a31';c.lineWidth=1.8;c.setLineDash([10,7]);const t=G.targetBounds;c.strokeRect(t.left*px,t.top*py,(t.right-t.left)*px,(t.bottom-t.top)*py);c.restore();
 return g;
}
