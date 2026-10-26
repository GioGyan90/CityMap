"""Mesa EGL inspection of the exported real triangles. Requires moderngl, numpy, Pillow.
Uses simplified fixed lighting, not the complete Three.js browser render pipeline.
"""
import json,sys,io,base64
import moderngl
import numpy as np
from PIL import Image,ImageDraw
ctx=moderngl.create_standalone_context(backend='egl')
width,height=960,640
rendered={}
shader=ctx.program(vertex_shader='''#version 330
in vec3 position;in vec3 normal;in vec3 color;in vec2 uv;uniform mat4 mvp;out vec3 n;out vec3 c;out vec2 texuv;out vec3 wp;
void main(){gl_Position=mvp*vec4(position,1);n=normal;c=color;texuv=uv;wp=position;}''',fragment_shader='''#version 330
in vec3 n;in vec3 c;in vec2 texuv;in vec3 wp;uniform sampler2D tex;uniform bool textured;uniform bool ground;uniform vec3 emission;uniform float opacity;out vec4 frag;
void main(){vec3 base=c;if(textured)base*=pow(texture(tex,texuv).rgb,vec3(2.2));if(ground){vec3 mask=texture(tex,vec2((wp.x+130.)/470.,1.-(wp.z+220.)/470.)).rgb;base=base*(1.-clamp(mask.r+mask.g+mask.b,0.,1.))+pow(vec3(.322,.427,.529),vec3(2.2))*mask.r+pow(vec3(.953,.906,.8),vec3(2.2))*mask.g+pow(vec3(1.,.937,.78),vec3(2.2))*mask.b;}float light=.52+.55*max(0.,dot(normalize(n),normalize(vec3(-.5,1,.7))));frag=vec4(pow(max(base*light+emission,vec3(0)),vec3(1./2.2)),opacity);}''')
data=json.load(open(sys.argv[1]));meshes=[];textures={};programs={}
def viewmatrix(eye,target):
 f=target-eye;f/=np.linalg.norm(f);r=np.cross(f,[0,1,0]);r/=np.linalg.norm(r);u=np.cross(r,f);m=np.eye(4);m[:3,:3]=[r,u,-f];m[:3,3]=-m[:3,:3]@eye;return m
light=np.array([-.3,.85,.4]);light/=np.linalg.norm(light);center=np.array([-100.,0.,50.]);lm=viewmatrix(center+light*550,center);lp=np.eye(4);lp[0,0]=lp[1,1]=1/340;lp[2,2]=-2/1000;lp[2,3]=-1;lightvp=lp@lm
bias=np.array([[.5,0,0,.5],[0,.5,0,.5],[0,0,.5,.5],[0,0,0,1.]])
for mesh in data['meshes']:
 if not mesh.get('water'):continue
 water=mesh['water'];kind=water.get('kind','surface')
 vertex='#version 330\n#define USE_SHADOWMAP\nuniform mat4 mvp;uniform mat4 modelMatrix;uniform mat4 viewMatrix;uniform mat3 normalMatrix;in vec3 position;in vec3 normal;\n'+water['vertex'].replace('varying','out').replace('projectionMatrix*viewMatrix*wp','mvp*wp')
 fragment='#version 330\n#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF_SOFT\nuniform vec3 cameraPosition;out vec4 frag;\n'+water['fragment'].replace('varying','in').replace('gl_FragColor','frag').replace('texture2D(', 'texture(').replace('#include <tonemapping_fragment>','').replace('#include <colorspace_fragment>','frag.rgb=pow(max(frag.rgb,vec3(0)),vec3(1./2.2));')
 ocean=ctx.program(vertex_shader=vertex,fragment_shader=fragment);programs[kind]=ocean
 for name,value in water['uniforms'].items():
  if name not in ocean:continue
  if isinstance(value,list):
   if not value:continue
   if len(value)>4:ocean[name].write(np.array(value,dtype='f4').tobytes())
   else:ocean[name].value=tuple(value)
  else:ocean[name].value=value
 ocean['modelMatrix'].write(np.eye(4).astype('f4').tobytes())
 if kind=='surface':assert 'directionalShadowMatrix' in ocean
 if kind=='surface' and 'directionalShadowMatrix' in ocean:
  ocean['directionalShadowMatrix'].write((bias@lightvp).T.astype('f4').tobytes())
  for name,value in {'receiveShadow':True,'directionalLightShadows[0].shadowBias':-.00035,'directionalLightShadows[0].shadowNormalBias':.2,'directionalLightShadows[0].shadowRadius':1.,'directionalLightShadows[0].shadowMapSize':(2048.,2048.),'directionalShadowMap':1}.items():
   if name in ocean:ocean[name].value=value
for mesh in data['meshes']:
 values=np.concatenate([np.array(mesh[key],dtype='f4').reshape(-1,3) for key in ['v','n','c']],axis=1)
 values=np.concatenate([values,np.array(mesh.get('uv',[0.]*(len(values)*2)),dtype='f4').reshape(-1,2)],axis=1)
 buffer=ctx.buffer(values.tobytes());vao=ctx.vertex_array(shader,[(buffer,'3f 3f 3f 2f','position','normal','color','uv')]);
 if mesh.get('water'):
  kind=mesh['water'].get('kind','surface');ocean=programs[kind];water_buffer=ctx.buffer(np.array(mesh['v'],dtype='f4').tobytes());attrs=[(water_buffer,'3f','position')];
  if 'normal' in ocean:attrs.append((ctx.buffer(np.array(mesh['n'],dtype='f4').tobytes()),'3f','normal'))
  if kind=='volume':attrs.append((ctx.buffer(np.array(mesh['edge'],dtype='f4').tobytes()),'1f','surfaceEdge'))
  vao=ctx.vertex_array(ocean,attrs)
 meshes.append((vao,mesh))
 source=mesh.get('groundTexture') or mesh.get('texture')
 if source and source not in textures:
  image=Image.open(io.BytesIO(base64.b64decode(source.split(',')[1]))).convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM);textures[source]=ctx.texture(image.size,3,image.tobytes())
# Real caster geometry rendered into a packed-depth light map, sampled by the ocean's r160 shadow chunks.
depth_program=ctx.program(vertex_shader='#version 330\nin vec3 position;uniform mat4 mvp;void main(){gl_Position=mvp*vec4(position,1);}',fragment_shader='#version 330\nout vec4 frag;\n'+data['packing']+'\nvoid main(){frag=packDepthToRGBA(gl_FragCoord.z);}')
depth_program['mvp'].write(lightvp.T.astype('f4').tobytes());shadow=ctx.texture((2048,2048),4);shadow.filter=(moderngl.NEAREST,moderngl.NEAREST);sfbo=ctx.framebuffer([shadow],ctx.depth_renderbuffer((2048,2048)));sfbo.use();sfbo.clear(1,1,1,1);ctx.enable(moderngl.DEPTH_TEST);ctx.disable(moderngl.BLEND);ctx.disable(moderngl.CULL_FACE)
for mesh in data['meshes']:
 if mesh.get('castShadow'):
  buf=ctx.buffer(np.array(mesh['v'],dtype='f4').tobytes());vao=ctx.vertex_array(depth_program,[(buf,'3f','position')]);vao.render();vao.release();buf.release()
shadow.use(1)
print('Shadow map range:',min(shadow.read()),max(shadow.read()))
fbo=ctx.simple_framebuffer((width,height));fbo.use();ctx.enable(moderngl.DEPTH_TEST)
data['views'] += [{**v,'name':v['name']+'-no-shadow','noShadow':True} for v in data['views'] if v['name'] in ['cruise-top','workboat-top','speedboat-top']]
page=Image.new('RGB',(1440,320*((len(data['views'])+2)//3)),'#b3d1e6')
meshes.sort(key=lambda item:1 if (item[1].get('water') or {}).get('kind')=='volume' else 2 if item[1].get('water') else 3 if item[1].get('opacity',1)<1 else 0)
ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA
for index,view in enumerate(data['views']):
 eye=np.array(view['eye'],float);target=np.array(view['target'],float);forward=target-eye;forward/=np.linalg.norm(forward)
 right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 matrix=np.eye(4);matrix[:3,:3]=[right,up,-forward];matrix[:3,3]=-matrix[:3,:3]@eye
 projection=np.eye(4);projection[0,0]=1/(view['scale']*width/height);projection[1,1]=1/view['scale'];projection[2,2]=-2/1500;projection[2,3]=-1
 shader['mvp'].write((projection@matrix).T.astype('f4').tobytes());fbo.clear(.7,.82,.9,1)
 for vao,mesh in meshes:
  if view.get('asset') and mesh.get('asset')!=view['asset']:continue
  if not view.get('asset') and mesh.get('asset'):continue
  if mesh.get('water'):
   ocean=programs[mesh['water'].get('kind','surface')];
   if 'receiveShadow' in ocean:ocean['receiveShadow'].value=not view.get('noShadow',False)
   ocean['mvp'].write((projection@matrix).T.astype('f4').tobytes());ocean['cameraPosition'].value=tuple(eye);
   if 'viewMatrix' in ocean:ocean['viewMatrix'].write(matrix.T.astype('f4').tobytes())
   if 'normalMatrix' in ocean:ocean['normalMatrix'].write(matrix[:3,:3].T.astype('f4').tobytes())
   ctx.enable(moderngl.BLEND);ctx.depth_mask=False;ctx.enable(moderngl.CULL_FACE);vao.render();continue
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
 rendered[view['name']]=np.array(image)
 image=image.resize((480,320));ImageDraw.Draw(image).text((10,10),view['name']+' | actual geometry + shadow GLSL / EGL',fill='white')
 page.paste(image,((index%3)*480,(index//3)*320))
stats={}
for name in ['cruise-top','workboat-top','speedboat-top']:
 delta=np.abs(rendered[name].astype(int)-rendered[name+'-no-shadow'].astype(int));stats[name]={'changedPixels':int(np.any(delta>2,axis=2).sum()),'maxDelta':int(delta.max())}
assert stats['cruise-top']['changedPixels']>30,stats
print('Real ocean shadow difference:',stats)
json.dump(stats,open(sys.argv[2].replace('.jpg','-shadows.json'),'w'),indent=2)
page.save(sys.argv[2],quality=92)
print(sys.argv[2])
