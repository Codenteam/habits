// ============================================
// CROP VALUES (pixels removed from captured screenshots)
// ============================================
export const CROP_TOP = 65;
export const CROP_BOTTOM = 10;
export const CROP_LEFT = 2;
export const CROP_RIGHT = 2;

// ============================================
// DEVICE CONFIGURATIONS
// ============================================
// screen:  SVG screen area dimensions and position
// capture: Window size for screenshot (screen + crop values)
// store:   Final image dimensions required by app stores
// ============================================
export const DEVICES = [
  {
    platform: 'mac',
    screen:  { width: 2640, height: 1500, x: 120, y: 60 },
    capture: { width: 2644, height: 1575 },
    store:   { width: 2880, height: 1800 },
  },

  {
    platform: 'ipad',
    screen:  { width: 2552, height: 1868, x: 90, y: 90 },
    capture: { width: 2556, height: 1943 },
    store:   { width: 2732, height: 2048 },
  },
    {
    platform: 'ios',
    screen:  { width: 1200, height: 2700, x: 60, y: 60 },
    capture: { width: 914, height: 2093 },
    store:   { width: 1320, height: 2868 },
  },
  {
    platform: 'android',
    screen:  { width: 990, height: 1830, x: 45, y: 45 },
    capture: { width: 994, height: 1905 },
    store:   { width: 1080, height: 1920 },
  },
] as const;

export type Platform = typeof DEVICES[number]['platform'];