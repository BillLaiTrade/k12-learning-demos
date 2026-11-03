// Static apparatus anchors; contents and interaction geometry share the same offset.
export const BODY_HOME={flask:{x:300,y:410},tank:{x:1000,y:480},marble:{x:520,y:560}};
export function bodyOffset(s,id){const home=BODY_HOME[id],p=s.dragging?.id===id?s.dragging.position:s.positions[id];return p?{x:p.x-home.x,y:p.y-home.y}:{x:0,y:0};}
export function bodyPoint(s,id,x,y){const d=bodyOffset(s,id);return{x:x+d.x,y:y+d.y};}
