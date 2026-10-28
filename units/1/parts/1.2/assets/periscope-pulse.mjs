// A brief whole-path flash: visible once, then fully off before another hint.
export const FLASH_MS=950;
export const STATIC_FLASH_MS=700;
export const REST_MS=1100;
export function pulseOpacity(elapsed,reduced=false) {
  if(elapsed<0)return 0;
  if(reduced)return elapsed<STATIC_FLASH_MS?1:0;
  return Math.max(0,Math.min(1,elapsed/80,(FLASH_MS-elapsed)/220));
}
