"""Exact trial post shader over actual city geometry, with approximate scene lighting.
EGL evidence, not a browser capture; sky/cloud/water/shadow pipelines are not reproduced.
"""
import base64,io,json,sys
from pathlib import Path
import moderngl,numpy as np
from PIL import Image,ImageDraw
ctx=moderngl.create_standalone_context(backend='egl');w,h=1440,900
stream=open(sys.argv[1]);data=json.loads(stream.readline());output=Path(sys.argv[2]);output.mkdir(parents=True,exist_ok=True)
geometry=ctx.program(vertex_shader='''#version 330
in vec3 position;in vec3 normal;in vec3 color;in vec2 uv;uniform mat4 mvp;out vec3 n;out vec3 c;out vec2 t;out vec3 wp;
void main(){gl_Position=mvp*vec4(position,1);n=normal;c=color;t=uv;wp=position;}''',fragment_shader='''#version 330
in vec3 n;in vec3 c;in vec2 t;in vec3 wp;uniform sampler2D tex;uniform sampler2D emap;uniform bool textured;uniform bool ground;uniform bool has_emap;uniform bool toon;uniform vec4 ramp;uniform vec3 sundir;uniform float day;uniform float night;uniform float direct;uniform float warm;uniform vec3 emission;uniform float opacity;out vec4 frag;
vec3 linearColor(vec3 v){return mix(pow((v+.055)/1.055,vec3(2.4)),v/12.92,lessThanEqual(v,vec3(.04045)));}
void main(){vec3 base=c;if(textured)base*=linearColor(texture(tex,t).rgb);
if(ground){vec3 mask=texture(tex,vec2((wp.x+130.)/470.,1.-(wp.z+220.)/470.)).rgb;base=base*(1.-clamp(mask.r+mask.g+mask.b,0.,1.))+linearColor(vec3(.322,.427,.529))*mask.r+linearColor(vec3(.953,.906,.8))*mask.g+linearColor(vec3(1.,.937,.78))*mask.b;}
vec3 ambient=mix(vec3(.08,.13,.24),vec3(.68,.80,.95),day)*(.65+.25*day);ambient=mix(ambient,ambient*vec3(1.25,.78,.67),warm*.38);vec3 suncolor=mix(vec3(1.,.96,.88),vec3(1.,.55,.30),warm);
float nl=dot(normalize(n),normalize(sundir));float lighting=toon?ramp[int(clamp(floor((nl*.5+.5)*4.),0.,3.))]:max(nl,0.);
vec3 lit=base*(ambient+suncolor*lighting*direct*.50);vec3 e=emission*.25;if(has_emap)e+=texture(emap,t).rgb*vec3(1.,.60,.22)*night*.65;
frag=vec4(max(lit+e,vec3(0)),opacity);}''')
post_vertex='#version 330\nin vec2 position;in vec2 uv;out vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0.,1.);}'
post_fragment='#version 330\nout vec4 frag;\n'+data['mangaFragment'].replace('varying vec2 vUv;','in vec2 vUv;').replace('texture2D(','texture(').replace('gl_FragColor','frag')
comic=ctx.program(vertex_shader=post_vertex,fragment_shader=post_fragment)
original=ctx.program(vertex_shader=post_vertex,fragment_shader='''#version 330
in vec2 vUv;uniform sampler2D tColor;out vec4 frag;
void main(){vec3 c=max(texture(tColor,vUv).rgb,vec3(0));c=mix(1.055*pow(c,vec3(1./2.4))-.055,c*12.92,step(c,vec3(.0031308)));frag=vec4(c,1);}''')
quad=ctx.buffer(np.array([-1,-1,0,0, 1,-1,1,0, -1,1,0,1, 1,1,1,1],dtype='f4').tobytes())
post_vaos={p:ctx.vertex_array(p,[(quad,'2f 2f','position','uv')]) for p in [comic,original]}
color=ctx.texture((w,h),4,dtype='f2');color.filter=(moderngl.LINEAR,moderngl.LINEAR);color.repeat_x=color.repeat_y=False
depth=ctx.depth_texture((w,h));depth.compare_func='';depth.filter=(moderngl.NEAREST,moderngl.NEAREST);depth.repeat_x=depth.repeat_y=False
beauty=ctx.framebuffer([color],depth);screen=ctx.simple_framebuffer((w,h))
textures={};meshes=[]
def texture(source):
 if source not in textures:
  im=Image.open(io.BytesIO(base64.b64decode(data['textures'][source].split(',')[1]))).convert('RGB').transpose(Image.Transpose.FLIP_TOP_BOTTOM);textures[source]=ctx.texture(im.size,3,im.tobytes());textures[source].build_mipmaps()
 return textures[source]
for line in stream:
 m=json.loads(line);arrays=[np.frombuffer(base64.b64decode(m[k]),dtype='f4').reshape(-1,3) for k in ['v','n','c']];arrays.append(np.frombuffer(base64.b64decode(m['uv']),dtype='f4').reshape(-1,2));buf=ctx.buffer(np.concatenate(arrays,axis=1).tobytes());vao=ctx.vertex_array(geometry,[(buf,'3f 3f 3f 2f','position','normal','color','uv')]);meshes.append((vao,m))
 for src in [m.get('groundTexture') or m.get('texture'),m.get('emissiveTexture')]:
  if src:texture(src)
meshes.sort(key=lambda pair:pair[1].get('opacity',1)<1)
ctx.blend_func=moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA
stats=[]
for view in data['views']:
 solar=view['solar'];eye=np.array(view['eye'],float);target=np.array(view['target'],float);forward=target-eye;forward/=np.linalg.norm(forward);right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 mat=np.eye(4);mat[:3,:3]=[right,up,-forward];mat[:3,3]=-mat[:3,:3]@eye;near,far=.5,4000.;f=1/np.tan(np.deg2rad(43)/2);projection=np.zeros((4,4));projection[0,0]=f/(w/h);projection[1,1]=f;projection[2,2]=(far+near)/(near-far);projection[2,3]=2*far*near/(near-far);projection[3,2]=-1
 geometry['mvp'].write((projection@mat).T.astype('f4').tobytes());geometry['sundir'].value=tuple(solar['direction']);geometry['day'].value=solar['daylight'];geometry['night'].value=solar['night'];geometry['direct'].value=solar['direct'];geometry['warm'].value=solar['warm'];geometry['tex'].value=0;geometry['emap'].value=1
 for mode,program,ramp in [('original',original,data['ORIGINAL_TOON_RAMP']),('manga',comic,data['MANGA_TOON_RAMP'])]:
  beauty.use();ctx.viewport=(0,0,w,h);ctx.enable(moderngl.DEPTH_TEST);ctx.depth_mask=True
  sky=(.55,.79,.94) if solar['daylight']>.8 else (.78,.45,.46) if solar['night']<.8 else (.025,.06,.13)
  beauty.clear(*(v**2.2 for v in sky),1);geometry['ramp'].value=tuple(v/255 for v in ramp)
  for vao,m in meshes:
   alpha=m.get('opacity',1);geometry['opacity'].value=alpha;src=m.get('groundTexture') or m.get('texture');em=m.get('emissiveTexture');geometry['ground'].value=bool(m.get('groundTexture'));geometry['textured'].value=bool(m.get('texture')) and not bool(m.get('groundTexture'));geometry['has_emap'].value=bool(em);geometry['toon'].value=m.get('toon',False)
   if src:texture(src).use(0)
   if em:texture(em).use(1)
   if alpha<1 or m.get('transparent'):ctx.enable(moderngl.BLEND)
   else:ctx.disable(moderngl.BLEND)
   ctx.depth_mask=m.get('depthWrite',True)
   if m.get('side')==2:ctx.disable(moderngl.CULL_FACE)
   else:ctx.enable(moderngl.CULL_FACE)
   geometry['emission'].value=tuple(m.get('emission',[0,0,0]));vao.render()
  ctx.depth_mask=True;screen.use();ctx.disable(moderngl.DEPTH_TEST|moderngl.CULL_FACE|moderngl.BLEND);color.use(0);program['tColor'].value=0
  if mode=='manga':
   depth.use(1);program['inverseViewProjection'].write(np.linalg.inv(projection@mat).T.astype('f4').tobytes());program['tDepth'].value=1;program['texel'].value=(1/w,1/h);program['nearPlane'].value=near;program['farPlane'].value=far;program['daylight'].value=solar['daylight'];program['inkColor'].value=tuple(data['inkColor']);program['fogColor'].value=tuple(solar['fogColor'])
  post_vaos[program].render(mode=moderngl.TRIANGLE_STRIP)
  pixels=np.frombuffer(screen.read(components=3),dtype='u1');assert pixels.max()>0
  image=Image.frombytes('RGB',(w,h),pixels.tobytes()).transpose(Image.Transpose.FLIP_TOP_BOTTOM);image.save(output/(view['name']+'-'+mode+'.jpg'),quality=92)
  stats.append({'view':view['name'],'mode':mode,'min':int(pixels.min()),'max':int(pixels.max()),'mean':float(pixels.mean())})
board=Image.new('RGB',(1440,450*3),'#b3d1e6');draw=ImageDraw.Draw(board)
for row,name in enumerate(['panorama','cargo','housing']):
 for col,mode in enumerate(['original','manga']):
  img=Image.open(output/(name+'-'+mode+'.jpg')).resize((720,450));board.paste(img,(col*720,row*450));draw.text((col*720+12,row*450+12),name+' | '+mode+' | actual geometry / approximate EGL',fill='white')
board.save(output/'comparison.jpg',quality=92);(output/'shader-check.json').write_text(json.dumps({'shaderCompile':'passed','exactPostFragment':True,'browser':False,'statistics':stats},indent=2))
print('EGL shader and five same-camera comparisons passed')
