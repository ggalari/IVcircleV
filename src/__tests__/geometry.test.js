import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, DEG, getSliceAngles, getPositions, sectorPath } from '../circle/geometry.js';

describe('circle/geometry', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has all required properties with correct values', () => {
      expect(DEFAULT_CONFIG.width).toBe(980);
      expect(DEFAULT_CONFIG.height).toBe(980);
      expect(DEFAULT_CONFIG.centerX).toBe(490);
      expect(DEFAULT_CONFIG.centerY).toBe(490);
      expect(DEFAULT_CONFIG.outerRadius).toBe(320);
      expect(DEFAULT_CONFIG.middleRadius).toBe(215);
      expect(DEFAULT_CONFIG.innerRadius).toBe(110);
      expect(DEFAULT_CONFIG.staffRadius).toBe(380);
      expect(DEFAULT_CONFIG.majorRadius).toBe(268);
      expect(DEFAULT_CONFIG.minorRadius).toBe(168);
    });
  });

  describe('DEG', () => {
    it('equals Math.PI / 180', () => {
      expect(DEG).toBe(Math.PI / 180);
    });
  });

  describe('getSliceAngles', () => {
    it('returns 12 angles for count=12', () => {
      const angles = getSliceAngles(12);
      expect(angles).toHaveLength(12);
    });

    it('starts at -90 degrees (top of circle) in radians', () => {
      const angles = getSliceAngles(12);
      expect(angles[0]).toBeCloseTo(-90 * DEG);
    });

    it('increments by 30 degrees for 12 slices', () => {
      const angles = getSliceAngles(12);
      const diff = angles[1] - angles[0];
      expect(diff).toBeCloseTo(30 * DEG);
    });

    it('returns correct count for arbitrary values', () => {
      expect(getSliceAngles(6)).toHaveLength(6);
      expect(getSliceAngles(1)).toHaveLength(1);
    });
  });

  describe('getPositions', () => {
    it('returns 12 position objects by default', () => {
      const positions = getPositions();
      expect(positions).toHaveLength(12);
    });

    it('each position has major, minor, and staff coordinates', () => {
      const positions = getPositions();
      positions.forEach(pos => {
        expect(pos.major).toHaveProperty('x');
        expect(pos.major).toHaveProperty('y');
        expect(pos.minor).toHaveProperty('x');
        expect(pos.minor).toHaveProperty('y');
        expect(pos.staff).toHaveProperty('x');
        expect(pos.staff).toHaveProperty('y');
      });
    });

    it('first position is at the top (angle -90°)', () => {
      const positions = getPositions();
      // At -90°, cos=-0 (≈0), sin=-1
      // major.x should be near centerX, major.y should be centerY - majorRadius
      expect(positions[0].major.x).toBeCloseTo(DEFAULT_CONFIG.centerX);
      expect(positions[0].major.y).toBeCloseTo(DEFAULT_CONFIG.centerY - DEFAULT_CONFIG.majorRadius);
    });
  });

  describe('sectorPath', () => {
    it('returns a valid SVG path string starting with M and ending with Z', () => {
      const d = sectorPath(490, 490, 215, 320, -105, -75);
      expect(d).toMatch(/^M .+ Z$/);
    });

    it('contains arc commands for both outer and inner radii', () => {
      const d = sectorPath(490, 490, 215, 320, -105, -75);
      expect(d).toContain('A 320 320 0 0 1');
      expect(d).toContain('A 215 215 0 0 0');
    });

    it('produces the same path as the original addNeighborSectorByIndex logic', () => {
      // Simulate index=0, outer ring: start = -90 + 0*30 - 15 = -105, end = -75
      const cx = 490, cy = 490, innerR = 215, outerR = 320;
      const startDeg = -105, endDeg = -75;

      const d = sectorPath(cx, cy, innerR, outerR, startDeg, endDeg);

      // Manually compute expected values
      const startRad = startDeg * Math.PI / 180;
      const endRad = endDeg * Math.PI / 180;
      const ox1 = cx + outerR * Math.cos(startRad);
      const oy1 = cy + outerR * Math.sin(startRad);
      const ox2 = cx + outerR * Math.cos(endRad);
      const oy2 = cy + outerR * Math.sin(endRad);
      const ix2 = cx + innerR * Math.cos(endRad);
      const iy2 = cy + innerR * Math.sin(endRad);
      const ix1 = cx + innerR * Math.cos(startRad);
      const iy1 = cy + innerR * Math.sin(startRad);

      const expected = `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 0 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 0 0 ${ix1} ${iy1} Z`;
      expect(d).toBe(expected);
    });
  });
});
