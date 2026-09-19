export type Point = {
  x: number;
  y: number;
};

export class EmaSmoother {
  private value: Point | null = null;

  constructor(private readonly alpha = 0.3) {
    if (alpha <= 0 || alpha > 1) throw new RangeError('EMA alpha must be in (0, 1]');
  }

  reset(value?: Point): void {
    this.value = value ? { ...value } : null;
  }

  update(next: Point): Point {
    if (!this.value) {
      this.value = { ...next };
    } else {
      // EMA step 1: measure the new sample's delta from the previous value.
      const deltaX = next.x - this.value.x;
      const deltaY = next.y - this.value.y;
      // EMA step 2: apply alpha to each delta to weight recent samples.
      this.value.x += this.alpha * deltaX;
      this.value.y += this.alpha * deltaY;
    }

    // EMA step 3: return a copy so callers cannot mutate internal state.
    return { ...this.value };
  }
}
