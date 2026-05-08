const ADJECTIVES = [
  "Calm", "Brave", "Quiet", "Swift", "Bright", "Warm", "Cool", "Wild",
  "Bold", "Free", "Keen", "Lone", "Pale", "Rare", "Safe", "Wise",
  "Deep", "Fair", "Glad", "Hazy", "Kind", "Mild", "Neat", "Open",
  "Pure", "Rich", "Shy", "Soft", "True", "Vast", "Wavy", "Zany",
];

const ANIMALS = [
  "Eagle", "Fox", "Owl", "Wolf", "Bear", "Cat", "Dog", "Deer",
  "Hawk", "Lynx", "Crow", "Dove", "Frog", "Hare", "Jay", "Moth",
  "Newt", "Orca", "Puma", "Rook", "Seal", "Tern", "Vole", "Wren",
  "Bat", "Elk", "Fin", "Gull", "Koi", "Leo", "Mouse", "Swan",
];

function hexToUint16(hex: string, offset: number): number {
  const byte = hex.substring(offset, offset + 4);
  return parseInt(byte, 16);
}

export function getDisplayName(hash: string): string {
  const adjIdx = hexToUint16(hash, 0) % ADJECTIVES.length;
  const animalIdx = hexToUint16(hash, 4) % ANIMALS.length;
  return ADJECTIVES[adjIdx] + ANIMALS[animalIdx];
}

export function getDisplayColor(hash: string): string {
  const hue = hexToUint16(hash, 8) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

// Derive a color from a display name string (for other users)
export function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}
