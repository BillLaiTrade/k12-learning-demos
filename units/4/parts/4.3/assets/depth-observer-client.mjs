import {renderObserverPixels} from './depth-observer.mjs?v=20261105-review1';

// At most one worker frame and one newest pending state. Camera geometry is
// unchanged; only raster resolution changes during interaction.
export function createObserverRenderer(canvas,onFrame){
  let worker=null,textures=null,busy=null,pending=null,detail=null,serial=0,textureVersion=0,latestSignature='';
  const signature=g=>`${g.depth}/${g.eyeX}/${canvas.clientWidth}/${textureVersion}`;
  const paint=(frame,job)=>{
    canvas.width=frame.width;canvas.height=frame.height;
    canvas.getContext('2d',{alpha:false}).putImageData(new ImageData(frame.pixels,frame.width,frame.height),0,0);
    const {pixels,...metadata}=frame;
    canvas.dataset.renderQuality=job.preview?'preview':'detail';
    onFrame(metadata,job.geometry);
  };
  function useFallback(){
    worker?.terminate();worker=null;
    canvas.dataset.renderer='main';
    if(busy&&!pending)pending=busy;
    busy=null;pump();
  }
  function pump(){
    if(busy||(!pending&&!detail)||!textures)return;
    const job=pending||detail;if(pending)pending=null;else detail=null;busy=job;
    if(worker){worker.postMessage({type:'render',...job});return;}
    // The fallback bounds work on the UI thread even without module workers.
    const width=job.preview?176:400,height=Math.round(width*530/720);
    const frame=renderObserverPixels(job.geometry,textures,width,height);
    busy=null;paint(frame,job);
    if(pending||detail)requestAnimationFrame(pump);
  }
  function connect(){
    worker=new Worker(new URL('./depth-observer-worker.mjs?v=20261105-review1',import.meta.url),{type:'module'});
    canvas.dataset.renderer='worker';
    worker.onmessage=({data})=>{
      const job=busy;if(!job||job.id!==data.id)return;
      if(data.error){useFallback();return;}
      busy=null;
      // A finished high-detail frame must not overwrite a newer interaction.
      // Preview frames may be one frame behind; both views consume that same state.
      if(job.textureVersion===textureVersion&&(job.preview||job.signature===latestSignature))paint(data,job);
      pump();
    };
    worker.onerror=event=>{event.preventDefault();useFallback();};
    if(textures)worker.postMessage({type:'textures',textures});
  }
  try{connect();}catch{canvas.dataset.renderer='main';}
  return{
    setTextures(value){textures=value;textureVersion++;pending=detail=null;worker?.postMessage({type:'textures',textures});},
    request(geometry,{preview=false}={}){
      const width=preview?160:Math.max(400,Math.min(1100,Math.round(canvas.clientWidth*2)));
      latestSignature=signature(geometry);
      const job={id:++serial,geometry,preview,width,height:Math.round(width*530/720),signature:latestSignature,textureVersion};
      if(preview){
        pending=job;detail=null;
        // Interaction takes priority over an idle high-resolution render.
        if(worker&&busy&&!busy.preview){worker.terminate();worker=null;busy=null;try{connect();}catch{canvas.dataset.renderer='main';}}
      }else detail=job;
      pump();
    },
    dispose(){worker?.terminate();worker=null;pending=detail=busy=null;}
  };
}
