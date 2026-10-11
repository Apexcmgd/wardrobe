import { describe, it, expect } from 'vitest';
import { generateDefaultClothingName, formatDate, formatShortDate } from './imageUtils';

describe('Image and naming utilities', () => {
  it('generates proper default names without stretching', () => {
    expect(generateDefaultClothingName('短袖', '运动短袖', 0)).toBe('运动短袖 #1');
    expect(generateDefaultClothingName('羽绒服', null, 2)).toBe('羽绒服 #3');
  });

  it('formats dates cleanly', () => {
    const ts = new Date(2026, 9, 11).getTime();
    expect(formatShortDate(ts)).toBe('10月11日');
  });

  it('calculates scaling factor without distorting aspect ratios', () => {
    // Test scale logic for portrait photo (3000 x 4000)
    const originalWidth = 3000;
    const originalHeight = 4000;
    const maxWidth = 1200;
    const maxHeight = 1200;

    const scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    const scaledWidth = Math.round(originalWidth * scale);
    const scaledHeight = Math.round(originalHeight * scale);

    // Verify proportions match exactly (3/4 = 0.75)
    expect(scaledWidth / scaledHeight).toBeCloseTo(originalWidth / originalHeight, 4);
    expect(scaledWidth).toBe(900);
    expect(scaledHeight).toBe(1200);
    expect(scaledWidth <= maxWidth).toBe(true);
    expect(scaledHeight <= maxHeight).toBe(true);
  });
});
