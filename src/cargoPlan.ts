/** Local metres, floor at +.5; the existing cargo site remains (-95,-140). */
export const CARGO_PLAN={deck:{w:56,d:34,y:.5},gate:{x:26.4,z:0,width:6.2},cranes:[{x:-20.5,z:-8.3},{x:-20.5,z:8.3}],ship:{x:-34,z:0},road:{minX:-11,maxX:28,minZ:-3.1,maxZ:3.1}};
export const CARGO_STACKS=[-12,-8.5,8.5,12].flatMap((z,row)=>[-5,3,11].map((x,col)=>({x,z,levels:(row+col)%2===0?2:1,color:(row+col)%4})));
export const CARGO_PARTS:Record<string,string>={'cargo-quay':'岸壁、基础、护舷与系缆','cargo-cranes':'双门架岸桥与吊具','cargo-stacks':'标准箱与堆场','cargo-circulation':'货运动线与场内牵引车','cargo-dispatch':'调度楼、门区与步行区','cargo-feeder':'集装箱支线货船'};

export const CARGO_CRANE_PARTS:Record<string,string>={'crane-running-gear':'轮组与走行底座','crane-portal':'四腿门架与侧向支撑','crane-boom':'双侧桁架吊臂','crane-machinery':'机房、司机室与承托平台','crane-hoist':'小车、钢缆与吊具','crane-access':'爬梯与连接'};
