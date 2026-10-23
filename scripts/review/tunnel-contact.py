"""Mesa EGL inspection of the exported real triangles. Requires moderngl, numpy, Pillow.
Uses simplified fixed lighting, not the complete Three.js browser render pipeline.
"""
import json,sys
import moderngl
import numpy as np
from PIL import Image,ImageDraw
ctx=moderngl.create_standalone_context(backend='egl')
width,height=960,640
shader=ctx.program(vertex_shader='''#version 330
in vec3 position;in vec3 normal;in vec3 color;uniform mat4 mvp;out vec3 n;out vec3 c;
void main(){gl_Position=mvp*vec4(position,1);n=normal;c=color;}''',fragment_shader='''#version 330
in vec3 n;in vec3 c;uniform vec3 emission;out vec4 frag;
void main(){float light=.52+.55*max(0.,dot(normalize(n),normalize(vec3(-.5,1,.7))));frag=vec4(pow(max(c*light+emission,vec3(0)),vec3(1./2.2)),1);}''')
data=json.load(open(sys.argv[1]));meshes=[]
for mesh in data['meshes']:
 values=np.concatenate([np.array(mesh[key],dtype='f4').reshape(-1,3) for key in ['v','n','c']],axis=1)
 buffer=ctx.buffer(values.tobytes());vao=ctx.vertex_array(shader,[(buffer,'3f 3f 3f','position','normal','color')]);meshes.append((vao,mesh))
fbo=ctx.simple_framebuffer((width,height));fbo.use();ctx.enable(moderngl.DEPTH_TEST)
page=Image.new('RGB',(1440,1280),'#b3d1e6')
for index,view in enumerate(data['views']):
 eye=np.array(view['eye'],float);target=np.array(view['target'],float);forward=target-eye;forward/=np.linalg.norm(forward)
 right=np.cross(forward,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,forward)
 matrix=np.eye(4);matrix[:3,:3]=[right,up,-forward];matrix[:3,3]=-matrix[:3,:3]@eye
 projection=np.eye(4);projection[0,0]=1/(view['scale']*width/height);projection[1,1]=1/view['scale'];projection[2,2]=-2/1500;projection[2,3]=-1
 shader['mvp'].write((projection@matrix).T.astype('f4').tobytes());fbo.clear(.7,.82,.9,1)
 for vao,mesh in meshes:
  if mesh['side']==2:ctx.disable(moderngl.CULL_FACE)
  else:ctx.enable(moderngl.CULL_FACE)
  shader['emission'].value=tuple(mesh['emission']);vao.render()
 image=Image.frombytes('RGB',(width,height),fbo.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 image=image.resize((480,320));ImageDraw.Draw(image).text((10,10),view['name']+' | actual mesh / EGL',fill='white')
 page.paste(image,((index%3)*480,(index//3)*320))
page.save(sys.argv[2],quality=92)
print(sys.argv[2])
