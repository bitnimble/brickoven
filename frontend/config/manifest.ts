type Font = string | { name: string, weights: number[] };
export type PageManifest = {
  title: string;
  description?: string,
  head?: {
    googleFonts?: Font[];
  };
  fallback?: Record<string, any>,
};

export const manifest = {
  title: 'Brick',
  description: 'A flexible recipe builder and viewer',
}
