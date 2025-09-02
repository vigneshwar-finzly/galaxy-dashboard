import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type CssVars = Record<string, string>;

export interface ThemePalette {
  id: string;
  name: string;
  description: string;
  // Primary brand tones
  primary: string;
  primaryLight: string;
  primaryDark: string;
  // Scale mapped to our "purple" tokens for compatibility
  scale: {
    50: string; 100: string; 200: string; 300: string; 400: string;
    500: string; 600: string; 700: string; 800: string; 900: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'ngfd_theme_palette_id';
  private paletteSubject = new BehaviorSubject<ThemePalette | null>(null);
  public readonly themeChanges$ = this.paletteSubject.asObservable();

  private readonly palettes: ThemePalette[] = [
    {
      id: 'azureSkies',
      name: 'Azure Skies',
      description: 'Soft blue with airy gradients',
      primary: '#3498db',
      primaryLight: '#5dade2',
      primaryDark: '#2e86c1',
      scale: {
        50: '#ebf5fb', 100: '#d6eaf8', 200: '#aed6f1', 300: '#85c1e9', 400: '#5dade2',
        500: '#3498db', 600: '#2e86c1', 700: '#2874a6', 800: '#21618c', 900: '#1b4f72'
      }
    },
    {
      id: 'evergreenForest',
      name: 'Evergreen Forest',
      description: 'Calm greens with depth',
      primary: '#27ae60',
      primaryLight: '#2ecc71',
      primaryDark: '#1e874b',
      scale: {
        50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
        500: '#27ae60', 600: '#1e874b', 700: '#16623a', 800: '#0e462b', 900: '#0a3621'
      }
    },
    {
      id: 'coralSunset',
      name: 'Coral Sunset',
      description: 'Warm coral with modern edge',
      primary: '#e74c3c',
      primaryLight: '#ef7368',
      primaryDark: '#c0392b',
      scale: {
        50: '#fdecea', 100: '#f9d0cc', 200: '#f3a79f', 300: '#ee7e74', 400: '#e95a52',
        500: '#e74c3c', 600: '#d64333', 700: '#b73a2c', 800: '#983124', 900: '#7c291e'
      }
    },
    {
      id: 'deepOcean',
      name: 'Deep Ocean',
      description: 'Indigo-blue with depth',
      primary: '#4f46e5',
      primaryLight: '#818cf8',
      primaryDark: '#4338ca',
      scale: {
        50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
        500: '#4f46e5', 600: '#4338ca', 700: '#3730a3', 800: '#312e81', 900: '#1e1b4b'
      }
    },
    {
      id: 'twilightPlum',
      name: 'Twilight Plum',
      description: 'Elegant plums and violets',
      primary: '#8e44ad',
      primaryLight: '#a569bd',
      primaryDark: '#6c3483',
      scale: {
        50: '#f5eaf9', 100: '#e9d3f2', 200: '#d3a7e6', 300: '#bc7bd9', 400: '#a651cd',
        500: '#8e44ad', 600: '#7a3b96', 700: '#693280', 800: '#592a6b', 900: '#482256'
      }
    }
  ];

  getPalettes(): ThemePalette[] {
    return this.palettes.slice();
  }

  initFromStorage(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const palette = this.palettes.find(p => p.id === saved) || this.palettes[0];
    this.applyTheme(palette.id);
  }

  applyTheme(paletteId: string): void {
    const palette = this.palettes.find(p => p.id === paletteId);
    if (!palette) return;

    const root = document.documentElement;

    const vars: CssVars = {
      '--color-primary': palette.primary,
      '--color-primary-light': palette.primaryLight,
      '--color-primary-dark': palette.primaryDark,
      // Useful derived primary variants
      '--color-primary-very-light': palette.scale[50],
      '--color-primary-lighter': palette.scale[100],
      '--color-primary-light-2': palette.scale[200],
      '--color-primary-border': palette.scale[400],
      '--color-primary-alpha-05': this.hexToRgba(palette.primary, 0.05),
      '--color-primary-alpha-10': this.hexToRgba(palette.primary, 0.10),
      '--color-primary-alpha-12': this.hexToRgba(palette.primary, 0.12),
      '--color-primary-alpha-15': this.hexToRgba(palette.primary, 0.15),
      '--color-primary-alpha-20': this.hexToRgba(palette.primary, 0.20),
      '--color-primary-alpha-22': this.hexToRgba(palette.primary, 0.22),
      '--color-primary-alpha-40': this.hexToRgba(palette.primary, 0.40),
      '--chart-area-fill-top': this.hexToRgba(palette.primary, 0.22),
      '--chart-area-fill-bottom': this.hexToRgba(palette.primary, 0.05),
      '--chart-tooltip-border': this.hexToRgba(palette.primary, 0.20),
      // Map the accent scale to our existing tokens
      '--color-purple-50': palette.scale[50],
      '--color-purple-100': palette.scale[100],
      '--color-purple-200': palette.scale[200],
      '--color-purple-300': palette.scale[300],
      '--color-purple-400': palette.scale[400],
      '--color-purple-500': palette.scale[500],
      '--color-purple-600': palette.scale[600],
      '--color-purple-700': palette.scale[700],
      '--color-purple-800': palette.scale[800],
      '--color-purple-900': palette.scale[900],
      '--color-border-purple': palette.scale[400],
      '--shadow-color-purple': this.hexToRgba(palette.primary, 0.15),
      '--gradient-purple': `linear-gradient(135deg, ${palette.primary} 0%, ${palette.primaryDark} 100%)`,
      '--gradient-purple-light': `linear-gradient(135deg, ${palette.primaryLight} 0%, ${palette.primary} 100%)`,
    };

    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));

    // Update browser UI color hint
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (meta) meta.setAttribute('content', palette.primary);

    localStorage.setItem(this.STORAGE_KEY, palette.id);
    this.paletteSubject.next(palette);
  }

  getCurrentPalette(): ThemePalette | null {
    return this.paletteSubject.getValue();
  }



  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}


