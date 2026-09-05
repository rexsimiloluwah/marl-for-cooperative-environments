export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export const palette = {
  white: '#FFFFFF',
  paper: '#F7FBFF',
  ink: '#10233F',
  muted: '#5C6F87',
  blue: '#1E90FF',
  navy: '#123A63',
  green: '#24A66A',
  orange: '#F59E42',
  red: '#E55454',
  purple: '#7A5AF8',
  line: '#D9E8F5',
  paleBlue: '#EAF5FF',
  paleGreen: '#EAF8F1',
  paleOrange: '#FFF3E6',
  palePurple: '#F1EDFF',
} as const;

export const chapterColors = {
  Background: palette.blue,
  Coordinate: palette.orange,
  Communicate: palette.purple,
  Adapt: palette.green,
  Synthesis: palette.navy,
} as const;

export const fontFamily = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';

