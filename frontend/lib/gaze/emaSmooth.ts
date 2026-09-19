export type Point = { x: number; y: number };
export class EmaSmoother {
  private value: Point | null = null;
  constructor(private readonly alpha = 0.3) { if (alpha <= 0 || alpha > 1) throw new RangeError('EMA alpha must be in (0, 1]'); }
  reset(value?: Point) { this.value = value ? { ...value } : null; }
  update(next: Point) { if (!this.value) this.value = { ...next }; else { this.value.x += this.alpha * (next.x - this.value.x); this.value.y += this.alpha * (next.y - this.value.y); } return { ...this.value }; }
}
