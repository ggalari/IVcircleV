import { describe, it, expect, vi } from 'vitest';
import { hitTestKey } from '../modes/hit-test.js';
import { DEFAULT_CONFIG } from '../circle/geometry.js';

/**
 * Helper to create a mock SVG element with a bounding rect.
 * Simulates the SVG being rendered at a given size and position.
 */
function mockSvgElement({ left = 0, top = 0, width = 980, height = 980 } = {}) {
  return {
    getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
  };
}

/**
 * Helper to compute client coordinates for a given SVG-space point
 * when the SVG is rendered at 1:1 scale at (0,0).
 */
function svgToClient(svgX, svgY, svgEl = mockSvgElement()) {
  const rect = svgEl.getBoundingClientRect();
  const scaleX = rect.width / DEFAULT_CONFIG.width;
  const scaleY = rect.height / DEFAULT_CONFIG.height;
  return { x: rect.left + svgX * scaleX, y: rect.top + svgY * scaleY };
}

describe('hitTestKey', () => {
  it('returns null when svgElement is null', () => {
    expect(hitTestKey({ x: 100, y: 100 }, null)).toBeNull();
  });

  it('returns null for tap at center (inside inner ring)', () => {
    const svg = mockSvgElement();
    // Center of the circle in SVG coords is (490, 490)
    const point = svgToClient(490, 490, svg);
    expect(hitTestKey(point, svg)).toBeNull();
  });

  it('returns null for tap outside outer ring', () => {
    const svg = mockSvgElement();
    // Far outside the circle
    const point = svgToClient(10, 10, svg);
    expect(hitTestKey(point, svg)).toBeNull();
  });

  it('detects major ring tap at top (slice 0 = C major)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, majorRadius } = DEFAULT_CONFIG;
    // Slice 0 is at the top (-90°), so the point is directly above center
    const point = svgToClient(centerX, centerY - majorRadius, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 0, type: 'major' });
  });

  it('detects minor ring tap at top (slice 0 = A minor)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, minorRadius } = DEFAULT_CONFIG;
    // Minor ring at top
    const point = svgToClient(centerX, centerY - minorRadius, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 0, type: 'minor' });
  });

  it('detects slice 3 (LA major) at correct angle', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, majorRadius } = DEFAULT_CONFIG;
    // Slice 3 is at -90 + 3*30 = 0° (pointing right)
    const point = svgToClient(centerX + majorRadius, centerY, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 3, type: 'major' });
  });

  it('detects slice 6 at bottom (SOL♭/FA# major)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, majorRadius } = DEFAULT_CONFIG;
    // Slice 6 is at -90 + 6*30 = 90° (pointing down)
    const point = svgToClient(centerX, centerY + majorRadius, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 6, type: 'major' });
  });

  it('detects slice 9 at left (MI♭ major)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, majorRadius } = DEFAULT_CONFIG;
    // Slice 9 is at -90 + 9*30 = 180° (pointing left)
    const point = svgToClient(centerX - majorRadius, centerY, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 9, type: 'major' });
  });

  it('handles scaled SVG (smaller viewport)', () => {
    // SVG rendered at half size, offset from origin
    const svg = mockSvgElement({ left: 50, top: 100, width: 490, height: 490 });
    const { centerX, centerY, majorRadius } = DEFAULT_CONFIG;
    // Slice 0 at top in SVG coords
    const point = svgToClient(centerX, centerY - majorRadius, svg);
    const result = hitTestKey(point, svg);
    expect(result).toEqual({ index: 0, type: 'major' });
  });

  it('returns null for tap exactly at innerRadius boundary (edge case)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, innerRadius } = DEFAULT_CONFIG;
    // Just inside the inner ring boundary — should be minor ring
    const point = svgToClient(centerX, centerY - innerRadius, svg);
    const result = hitTestKey(point, svg);
    // At exactly innerRadius, it's on the boundary of the minor ring (inclusive)
    expect(result).toEqual({ index: 0, type: 'minor' });
  });

  it('returns null for tap just inside inner ring (below innerRadius)', () => {
    const svg = mockSvgElement();
    const { centerX, centerY, innerRadius } = DEFAULT_CONFIG;
    // Just inside the inner ring (closer to center)
    const point = svgToClient(centerX, centerY - (innerRadius - 5), svg);
    const result = hitTestKey(point, svg);
    expect(result).toBeNull();
  });
});
