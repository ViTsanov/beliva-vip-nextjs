import type { CSSProperties } from 'react';

// Силуетът на континента (картинките в public/assets/continents), оцветен в цвета на континента —
// PNG-то се ползва като маска, така че една и съща картинка може да е в какъвто цвят трябва.
export default function ContinentShape({ src, color, className = '' }: { src: string; color: string; className?: string }) {
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={`block ${className}`}
      style={{ backgroundColor: color, WebkitMask: mask, mask } as CSSProperties}
    />
  );
}
