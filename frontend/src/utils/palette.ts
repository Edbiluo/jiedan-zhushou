// 马卡龙色板 —— 每本书按 id 循环取一个稳定的色卡
export interface MacaronColor {
  name: string;
  light: string;   // 渐变起点（浅）
  dark: string;    // 渐变终点（深）
  solid: string;   // 视频/单点用的中间调
  ink: string;     // 文字在此底色上的可读色
  icon: string;    // emoji 图标
}

export const MACARON_PALETTE: MacaronColor[] = [
  { name: 'peach',      light: '#FFE4D3', dark: '#F5B997', solid: '#FACAA8', ink: '#8C4D2C', icon: '💛' },
  { name: 'mint',       light: '#DCF1E3', dark: '#9BD7B4', solid: '#B6E2C5', ink: '#316B4C', icon: '🌿' },
  { name: 'lavender',   light: '#E7DEF6', dark: '#BFA8E8', solid: '#D4C3F0', ink: '#553883', icon: '⭐' },
  { name: 'rose',       light: '#FBD9DE', dark: '#F2ABB6', solid: '#F6C2CA', ink: '#883B4B', icon: '💗' },
  { name: 'sky',        light: '#DBECF6', dark: '#A7CEE5', solid: '#BFDBED', ink: '#355F7D', icon: '💙' },
  { name: 'lemon',      light: '#FFF2C7', dark: '#F3D672', solid: '#F9E296', ink: '#8A6A1E', icon: '🌟' },
  { name: 'pistachio',  light: '#E4EFCD', dark: '#B9D8A0', solid: '#CDE3B3', ink: '#4C6E2A', icon: '🍀' },
  { name: 'periwinkle', light: '#DDE0F4', dark: '#B4B8E4', solid: '#C6CAEB', ink: '#3E4487', icon: '🔮' },
  { name: 'apricot',    light: '#FFE8C9', dark: '#F5C57E', solid: '#F8D49B', ink: '#7E5220', icon: '☀️' },
  { name: 'blueberry',  light: '#D7DEF1', dark: '#9AA8DC', solid: '#B7C0E6', ink: '#333C76', icon: '💜' },
];

export function bookPalette(id: number): MacaronColor {
  return MACARON_PALETTE[Math.abs(id) % MACARON_PALETTE.length];
}

export function bookGradient(
  id: number,
  _opts: { light?: number; dark?: number; sat?: number } = {}
) {
  const p = bookPalette(id);
  return `linear-gradient(90deg, ${p.light} 0%, ${p.dark} 100%)`;
}

export function bookSolid(id: number) {
  return bookPalette(id).solid;
}

export function bookInk(id: number) {
  return bookPalette(id).ink;
}

export function bookIcon(id: number): string {
  return MACARON_PALETTE[Math.abs(id) % MACARON_PALETTE.length].icon;
}

// 任务类型标准色（马卡龙系）
export const TASK_PALETTE = {
  creation: { light: '#FBE5EB', dark: '#F4B9CC', solid: '#F7CDD8', ink: '#8B3C55' }, // 马卡龙玫瑰
  editing:  { light: '#E8DFF7', dark: '#BFA8E8', solid: '#D4C3F0', ink: '#5B3C8A' }, // 马卡龙薰衣草
};

// 状态色（全部马卡龙化）
export const STATUS_PALETTE = {
  leave:       { bg: '#FFF0D6', ink: '#8A5E26' }, // 奶油杏
  today_ring:  '#A7CEE5',                          // 马卡龙天空
  in_progress: { bg: '#DBECF6', ink: '#355F7D' },
  near_due:    { bg: '#FFE8C9', ink: '#7E5220' },
  overdue:     { bg: '#FBD9DE', ink: '#883B4B' },
  completed:   { bg: '#DCF1E3', ink: '#316B4C' },
};
