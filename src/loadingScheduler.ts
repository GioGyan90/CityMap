/** No scene dependencies: headless builders retain the same deterministic order. */
type YieldTask=(label:string)=>Promise<void>;
let yieldTask:YieldTask|undefined;
export function configureLoading(task?:YieldTask){yieldTask=task;}
export async function checkpoint(label:string){if(yieldTask)await yieldTask(label);}
export async function runSteps(steps:Generator<unknown,void,unknown>,label:string){
 for(const _ of steps)await checkpoint(label);
}
