

/* 世界常量 */
export const GROUND_Y = 1.06;          // 城市地面高度
export const Z0 = -150, Z1 = 150;      // 岛屿南北范围
export const X_END = 190;              // 陆地东界（山脚）
export const COAST = z => -58 + 5 * Math.sin(z * 0.04) + 3 * Math.cos(z * 0.1); // 海岸线
export const BEACH_W = 12;
