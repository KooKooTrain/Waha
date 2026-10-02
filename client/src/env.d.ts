import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'waha-water': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        intensity?: string; speed?: string; sand?: string; ripples?: string;
      };
    }
  }
}
