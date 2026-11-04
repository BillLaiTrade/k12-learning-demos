import {renderObserverPixels} from './depth-observer.mjs?v=20261105-review1';

let textures;
self.onmessage=({data})=>{
  if(data.type==='textures'){textures=data.textures;return;}
  if(data.type!=='render'||!textures)return;
  try{
    const frame=renderObserverPixels(data.geometry,textures,data.width,data.height);
    self.postMessage({id:data.id,...frame},[frame.pixels.buffer]);
  }catch(error){self.postMessage({id:data.id,error:String(error.message||error)});}
};
