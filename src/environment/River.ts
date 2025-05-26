export interface River {
  flowDirection: number; // in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
  flowRate: number;     // pixels per second
}

export const createRiver = (direction: number = 0, rate: number = 50): River => {
  return {
    flowDirection: direction,
    flowRate: rate
  };
}; 