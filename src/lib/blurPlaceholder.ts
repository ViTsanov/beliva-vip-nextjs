// src/lib/blurPlaceholder.ts
// Малък base64 placeholder (размазан градиент в брандовите цветове), използван като
// blurDataURL за next/image компоненти. Целта е снимката да не "изскача" рязко от
// празно пространство, а плавно да се фокусира — намалява усещането за забавяне,
// особено на мобилен интернет.
export const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMiIgaGVpZ2h0PSIxMiI+PHJlY3Qgd2lkdGg9IjEyIiBoZWlnaHQ9IjEyIiBmaWxsPSIjZTVlN2ViIi8+PC9zdmc+';
