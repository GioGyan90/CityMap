"""Approximate solar-lit EGL review, using actual city geometry and textures.
Not a WebGL screenshot: no browser sky, cloud, fog, shadow or full water shaders.
"""
import base64,io,json,sys
from pathlib import Path
import moderngl,numpy as np
from PIL import Image
ctx=moderngl.create_standalone_context(backend='egl');w,h=1440,900
shader=ctx.program(vertex_shader='''#version 330
in vec3 position;in vec3 normal;in vec3 color;in vec2 uv;uniform mat4 mvp;out vec3 n;out vec3 c;out vec2 t;out vec3 wp;
void main(){gl_Position=mvp*vec4(position,1);n=normal;c=color;t=uv;wp=position;}''',fragment_shader='''#version 330
in vec3 n;in vec3 c;in vec2 t;in vec3 wp;uniform sampler2D tex;uniform sampler2D emap;uniform bool textured;uniform bool ground;uniform bool has_emap;uniform bool water;uniform vec3 sundir;uniform float day;uniform float night;uniform float direct;uniform float warm;uniform vec3 emission;uniform float opacity;out vec4 frag;
void main(){vec3 base=c;if(textured)base*=pow(texture(tex,t).rgb,vec3(2.2));
if(ground){vec3 mask=texture(tex,vec2((wp.x+130.)/470.,1.-(wp.z+220.)/470.)).rgb;base=base*(1.-clamp(mask.r+mask.g+mask.b,0.,1.))+pow(vec3(.322,.427,.529),vec3(2.2))*mask.r+pow(vec3(.953,.906,.8),vec3(2.2))*mask.g+pow(vec3(1.,.937,.78),vec3(2.2))*mask.b;}
if(water){base=mix(base,vec3(.004,.025,.07),night*.8);}
vec3 ambient=mix(vec3(.08,.13,.24),vec3(.68,.80,.95),day)*(.65+.25*day);ambient=mix(ambient,ambient*vec3(1.25,.78,.67),warm*.38);vec3 suncolor=mix(vec3(1.,.96,.88),vec3(1.,.55,.30),warm);
vec3 lit=base*(ambient+suncolor*max(dot(normalize(n),normalize(sundir)),0.)*direct*.50);
vec3 e=emission*.25;if(has_emap)e+=texture(emap,t).rgb*vec3(1.,.60,.22)*night*.65;
frag=vec4(pow(max(lit+e,vec3(0)),vec3(1./2.2)),opacity);}''')
stream=open(sys.argv[1]);data=json.loads(stream.readline());meshes=[];textures={}
def texture(source):
 if source not in textures:
  im=Image.open(io.BytesIO(base64.b64decode(data['textures'][source].split(',')[1]))).convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM);textures[source]=ctx.texture(im.size,3,im.tobytes());textures[source].build_mipmaps()
 return textures[source]
for line in stream:
 m=json.loads(line);arrays=[np.asarray(m[k],dtype='f4').reshape(-1,3) for k in ['v','n','c']];arrays.append(np.asarray(m.get('uv',[0.]*(len(arrays[0])*2)),dtype='f4').reshape(-1,2));buf=ctx.buffer(np.concatenate(arrays,axis=1).tobytes());vao=ctx.vertex_array(shader,[(buf,'3f 3f 3f 2f','position','normal','color','uv')]);meshes.append((vao,m))
 for src in [m.get('groundTexture') or m.get('texture'),m.get('emissiveTexture')]:
  if src:texture(src)
meshes.sort(key=lambda item:item[1].get('opacity',1)<1)
fbo=ctx.simple_framebuffer((w,h));fbo.use();ctx.enable(moderngl.DEPTH_TEST);ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA
for view in data['views']:
 solar=view['solar'];eye=np.array(view['eye'],float);target=np.array(view['target'],float);forward=target-eye;forward/=np.linalg.norm(forward);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 mat=np.eye(4);mat[:3,:3]=[right,up,-forward];mat[:3,3]=-mat[:3,:3]@eye;near,far=.5,4000.;f=1/np.tan(np.deg2rad(43)/2);projection=np.zeros((4,4));projection[0,0]=f/(w/h);projection[1,1]=f;projection[2,2]=(far+near)/(near-far);projection[2,3]=2*far*near/(near-far);projection[3,2]=-1
 shader['mvp'].write((projection@mat).T.astype('f4').tobytes());shader['sundir'].value=tuple(solar['direction']);shader['day'].value=solar['daylight'];shader['night'].value=solar['night'];shader['direct'].value=solar['direct'];shader['warm'].value=solar['warm'];shader['tex'].value=0;shader['emap'].value=1
 sky={'day':(.55,.79,.94),'sunset':(.78,.45,.46),'night':(.025,.06,.13)}.get(view['name'],(.55,.79,.94));fbo.clear(*sky,1)
 for vao,m in meshes:
  alpha=m.get('opacity',1);shader['opacity'].value=alpha;src=m.get('groundTexture') or m.get('texture');em=m.get('emissiveTexture');shader['ground'].value=bool(m.get('groundTexture'));shader['textured'].value=bool(m.get('texture')) and not bool(m.get('groundTexture'));shader['has_emap'].value=bool(em);shader['water'].value=bool(m.get('water'))
  if src:texture(src).use(0)
  if em:texture(em).use(1)
  if alpha<1:ctx.enable(moderngl.BLEND);ctx.depth_mask=False
  else:ctx.disable(moderngl.BLEND);ctx.depth_mask=True
  if m.get('side')==2:ctx.disable(moderngl.CULL_FACE)
  else:ctx.enable(moderngl.CULL_FACE)
  shader['emission'].value=tuple(m.get('emission',[0,0,0]));vao.render()
 ctx.depth_mask=True;img=Image.frombytes('RGB',(w,h),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);img.save(Path(sys.argv[2])/(view['name']+'.jpg'),quality=92)
print('Rendered approximate EGL views:',','.join(v['name'] for v in data['views']))

images=[Image.open(Path(sys.argv[2])/(name+'.jpg')) for name in ['front','east','back','top']]
board=Image.new('RGB',(1440,900))
for i,img in enumerate(images):board.paste(img.resize((720,450)),((i%2)*720,(i//2)*450))
board.save(Path(sys.argv[2])/'grey-views.jpg',quality=92)
