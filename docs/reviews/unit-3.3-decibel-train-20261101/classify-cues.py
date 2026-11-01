import numpy as np,subprocess,json,csv,pathlib,sys
from ai_edge_litert.interpreter import Interpreter
model=Interpreter(model_path=sys.argv[2],num_threads=2);model.allocate_tensors();inp=model.get_input_details()[0];outs=model.get_output_details();print('input',inp['shape'],'output',[(o['name'],o['shape']) for o in outs],flush=True)
labels=[r['display_name'] for r in csv.DictReader(open(sys.argv[3]))]
file=sys.argv[1]
a=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',file,'-vn','-ac','1','-ar','16000','-f','f32le','-']),dtype=np.float32).copy()
rows=[];size=int(np.prod(inp['shape']));out=next(o for o in outs if o['shape'][-1]==521)
for start in range(0,len(a)//16000-9,10):
 clip=a[start*16000:(start+10)*16000].copy();rms=float(np.sqrt(np.mean(clip**2)));gain=min(.1/max(rms,1e-8),.95/max(float(abs(clip).max()),1e-8));clip*=gain
 scores=[]
 for offset in range(0,len(clip)-size+1,size):
  model.set_tensor(inp['index'],clip[offset:offset+size].reshape(inp['shape']));model.invoke();scores.append(model.get_tensor(out['index']).reshape(-1,521).mean(axis=0))
 s=np.mean(scores,axis=0);top=s.argsort()[-6:][::-1]
 related={labels[i]:round(float(v),4) for i,v in enumerate(s) if any(x in labels[i].lower() for x in ['train','railroad','rail transport','goose','water','bird'])}
 row=dict(start=start,top=[(labels[i],round(float(s[i]),4)) for i in top],related=related);rows.append(row);print(start,row['top'],flush=True)
pathlib.Path(sys.argv[4]).write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
