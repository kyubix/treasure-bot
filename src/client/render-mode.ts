/**
 * Three.js is the default renderer for BOTH user-facing game views.
 * Keep opt-out flags for old Android devices and emergency troubleshooting.
 *
 * ?map3d=0  : legacy Phaser World Map only
 * ?board2d=1 : legacy Phaser Board View only
 *
 * ?map3d=1 remains accepted for backward-compatible old preview links.
 */
export function useThreeWorldMap(params:URLSearchParams):boolean {
  return params.get('map3d')!=='0';
}
export function useThreeBoardView(params:URLSearchParams):boolean {
  return params.get('board2d')!=='1';
}
