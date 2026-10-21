import { westCoast } from './layout';


/* 世界常量 */
export const GROUND_Y = 1.06;          // 城市地面高度
export const Z0 = -200, Z1 = 202;      // 岛屿南北范围
export const X_END = 290;              // 陆地东界（山脚）
export const COAST = westCoast;
export const BEACH_W = 12;

export const buildingFootprints: { x: number; z: number; w: number; d: number }[] = [];
