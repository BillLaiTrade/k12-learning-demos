import {bodyOffset} from './collection-task-layout.mjs?v=b-decisions-20261104';
export const TANK_INSIDE=[[597,377],[655,336],[1050,356],[1043,517],[1006,548],[607,524]];
export function inPolygon(points,p){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const[x,y]=points[i],[u,v]=points[j];if(Math.abs((p.x-x)*(v-y)-(p.y-y)*(u-x))<1e-7&&p.x>=Math.min(x,u)&&p.x<=Math.max(x,u)&&p.y>=Math.min(y,v)&&p.y<=Math.max(y,v))return true;if((y>p.y)!==(v>p.y)&&p.x<(u-x)*(p.y-y)/(v-y)+x)hit=!hit;}return hit;}
export function tankWaterRegion(s,{local=false}={}){const d=local?{x:0,y:0}:bodyOffset(s,'tank'),y=524-119*s.tankWater;return{kind:'tank-water',points:[[597,y],[655,y-38],[1050,y-18],[1043,517],[1006,548],[607,524]].map(([x,y])=>[x+d.x,y+d.y]),boundary:TANK_INSIDE.map(([x,y])=>[x+d.x,y+d.y]),empty:s.tankWater<=0};}
export function inTankWater(region,p){return !region.empty&&inPolygon(region.boundary,p)&&inPolygon(region.points,p);}
