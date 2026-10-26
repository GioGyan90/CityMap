"""Mesa EGL inspection of the exported real triangles. Requires moderngl, numpy, Pillow.
Uses simplified fixed lighting, not the complete Three.js browser render pipeline.
"""
import json,sys,io,base64,os
from pathlib import Path
import moderngl
import numpy as np
from PIL import Image,ImageDraw
ctx=moderngl.create_standalone_context(backend='egl')
width,height=960,640
shader=ctx.program(vertex_shader='''#version 330
in vec3 position;in vec3 normal;in vec3 color;in vec2 uv;uniform mat4 mvp;out vec3 n;out vec3 c;out vec2 texuv;out vec3 wp;
void main(){gl_Position=mvp*vec4(position,1);n=normal;c=color;texuv=uv;wp=position;}''',fragment_shader='''#version 330
in vec3 n;in vec3 c;in vec2 texuv;in vec3 wp;uniform sampler2D tex;uniform bool textured;uniform bool ground;uniform vec3 emission;uniform float opacity;out vec4 frag;
void main(){vec3 base=c;if(textured)base*=pow(texture(tex,texuv).rgb,vec3(2.2));if(ground){vec3 mask=texture(tex,vec2((wp.x+130.)/470.,1.-(wp.z+220.)/470.)).rgb;base=base*(1.-clamp(mask.r+mask.g+mask.b,0.,1.))+pow(vec3(.322,.427,.529),vec3(2.2))*mask.r+pow(vec3(.953,.906,.8),vec3(2.2))*mask.g+pow(vec3(1.,.937,.78),vec3(2.2))*mask.b;}float light=.52+.55*max(0.,dot(normalize(n),normalize(vec3(-.5,1,.7))));frag=vec4(pow(max(base*light+emission,vec3(0)),vec3(1./2.2)),opacity);}''')
data=json.load(open(sys.argv[1]));meshes=[];textures={}
for mesh in data['meshes']:
 values=np.concatenate([np.array(mesh[key],dtype='f4').reshape(-1,3) for key in ['v','n','c']],axis=1)
 values=np.concatenate([values,np.array(mesh.get('uv',[0.]*(len(values)*2)),dtype='f4').reshape(-1,2)],axis=1)
 buffer=ctx.buffer(values.tobytes());vao=ctx.vertex_array(shader,[(buffer,'3f 3f 3f 2f','position','normal','color','uv')]);meshes.append((vao,mesh))
 source=mesh.get('groundTexture') or mesh.get('texture')
 if source and source not in textures:
  image=Image.open(io.BytesIO(base64.b64decode(source.split(',')[1]))).convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM);textures[source]=ctx.texture(image.size,3,image.tobytes())
fbo=ctx.simple_framebuffer((width,height));fbo.use();ctx.enable(moderngl.DEPTH_TEST)
page=Image.new('RGB',(1440,320*((len(data['views'])+2)//3)),'#b3d1e6')
meshes.sort(key=lambda item:item[1].get('opacity',1)<1)
ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA
for index,view in enumerate(data['views']):
 eye=np.array(view['eye'],float);target=np.array(view['target'],float);forward=target-eye;forward/=np.linalg.norm(forward)
 right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 matrix=np.eye(4);matrix[:3,:3]=[right,up,-forward];matrix[:3,3]=-matrix[:3,:3]@eye
 projection=np.eye(4);projection[0,0]=1/(view['scale']*width/height);projection[1,1]=1/view['scale'];projection[2,2]=-2/1500;projection[2,3]=-1
 shader['mvp'].write((projection@matrix).T.astype('f4').tobytes());fbo.clear(.7,.82,.9,1)
 for vao,mesh in meshes:
  if view.get('asset') and mesh.get('asset')!=view['asset']:continue
  alpha=mesh.get('opacity',1);shader['opacity'].value=alpha
  source=mesh.get('groundTexture') or mesh.get('texture');shader['ground'].value=bool(mesh.get('groundTexture'));shader['textured'].value=bool(mesh.get('texture')) and not bool(mesh.get('groundTexture'))
  if source:textures[source].use(0)
  if alpha<1:ctx.enable(moderngl.BLEND);ctx.depth_mask=False
  else:ctx.disable(moderngl.BLEND);ctx.depth_mask=True
  if mesh['side']==2:ctx.disable(moderngl.CULL_FACE)
  else:ctx.enable(moderngl.CULL_FACE)
  shader['emission'].value=tuple(mesh['emission']);vao.render()
 ctx.depth_mask=True
 image=Image.frombytes('RGB',(width,height),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 if os.environ.get('CITYMAP_REVIEW_FRAMES') and (not os.environ.get('CITYMAP_REVIEW_NAMES') or view['name'] in os.environ['CITYMAP_REVIEW_NAMES'].split(',')):
  folder=Path(os.environ['CITYMAP_REVIEW_FRAMES']);folder.mkdir(parents=True,exist_ok=True);image.save(folder/(view['name']+'.jpg'))
 image=image.resize((480,320));ImageDraw.Draw(image).text((10,10),view['name']+' | actual mesh / EGL',fill='white')
 page.paste(image,((index%3)*480,(index//3)*320))
page.save(sys.argv[2],quality=92)
print(sys.argv[2])
