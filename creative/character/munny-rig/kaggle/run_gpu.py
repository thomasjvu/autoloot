"""Kaggle script entrypoint. Inputs arrive via a private Kaggle dataset."""
import os, sys, subprocess, pathlib, json, hashlib, time, shutil
ROOT=pathlib.Path('/kaggle/working'); OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
REV='df019de5129d6c4b406587a14c3501669441a783'
def run(args,**kw):subprocess.run(args,check=True,**kw)
manifest={'source_revision':REV,'started':time.time(),'status':'starting','resolution':768,'seed':42}
def save(): (OUT/'run.json').write_text(json.dumps(manifest,indent=2))
save()
try:
 run(['nvidia-smi'])
 import torch
 devices=[torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]
 manifest['gpus']=devices;save()
 if len(devices)!=2 or not all('T4' in d for d in devices):raise RuntimeError('Expected Kaggle T4 x2; stop rather than use an unintended accelerator.')
 repo=ROOT/'see-through'
 run(['git','clone','https://github.com/shitagaki-lab/see-through.git',str(repo)])
 run(['git','checkout',REV],cwd=repo)
 # Keep Kaggle's CUDA PyTorch; upstream packages provide the remaining inference stack.
 run([sys.executable,'-m','pip','install','-r','requirements.txt'],cwd=repo)
 # T4 lacks native BF16. Use FP16 for this pinned source and retain the patch.
 f=repo/'common/utils/inference_utils.py';old=f.read_text();count=old.count('torch.bfloat16')
 if count!=6:raise RuntimeError('Precision patch no longer matches reviewed source.')
 f.write_text(old.replace('torch.bfloat16','torch.float16'))
 (OUT/'t4-precision.patch').write_text(subprocess.check_output(['git','diff'],cwd=repo,text=True))
 inputs=list(pathlib.Path('/kaggle/input').rglob('source.png'))
 if len(inputs)!=1:raise RuntimeError('Expected exactly one source.png in attached input dataset.')
 source=inputs[0];manifest['input_sha256']=hashlib.sha256(source.read_bytes()).hexdigest();manifest['precision']='float16';save()
 # Separate processes release VRAM between stages and use each T4 explicitly.
 stage=ROOT/'stage.py'
 stage.write_text('''import sys\nfrom utils.inference_utils import apply_layerdiff,apply_marigold,further_extr\nfrom utils.torch_utils import seed_everything\nseed_everything(42)\nmode,src,out=sys.argv[1:]\nif mode=='layers': apply_layerdiff(src,'layerdifforg/seethroughv0.0.2_layerdiff3d',save_dir=out,seed=42,resolution=768,group_offload=True)\nelif mode=='depth': apply_marigold(src,'24yearsold/seethroughv0.0.1_marigold',save_dir=out,seed=42,resolution=768,group_offload=True)\nelse: further_extr(out+'/source',rotate=False,save_to_psd=True,tblr_split=True)\n''')
 env={**os.environ,'PYTHONPATH':str(repo/'common')+':'+str(repo/'annotators'),'PYTHONUNBUFFERED':'1'}
 for mode,gpu in [('layers','0'),('depth','1'),('assemble','0')]:
  manifest['status']=mode;save()
  run([sys.executable,str(stage),mode,str(source),str(OUT)],cwd=repo,env={**env,'CUDA_VISIBLE_DEVICES':gpu})
 psds=list(OUT.glob('*.psd'))
 if not psds:raise RuntimeError('No PSD produced.')
 from psd_tools import PSDImage
 psd=PSDImage.open(psds[0]); layers=OUT/'layers';layers.mkdir(exist_ok=True)
 exported=[]
 for i,layer in enumerate(psd):
  if layer.is_group():continue
  image=layer.topil()
  if image is None:continue
  from PIL import Image
  canvas=Image.new('RGBA',psd.size);canvas.alpha_composite(image.convert('RGBA'),(layer.left,layer.top))
  filename=f'{i:02d}.png';canvas.save(layers/filename);exported.append({'file':filename,'name':layer.name,'bbox':list(layer.bbox)})
 (OUT/'layers.json').write_text(json.dumps({'canvas':psd.size,'layers':exported},indent=2))
 # Preview composition is optional; raw channel extraction above is authoritative.
 try: psd.composite().save(OUT/'composite.png')
 except Exception as error: manifest['preview_warning']=str(error)
 manifest.update(status='complete',finished=time.time());save()
 run([sys.executable,'-m','pip','freeze'],stdout=open(OUT/'requirements-resolved.txt','w'))
 shutil.make_archive(str(ROOT/'munny-seethrough'),'zip',OUT)
except Exception as e:
 manifest.update(status='failed',error=str(e),finished=time.time());save();raise
