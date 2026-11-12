/** Keep ordered server checkpoints off the slide navigation path. */
export class CourseSlideSaves {
  private savedThrough: number;
  private wantedThrough: number;
  private flight?: Promise<void>;

  constructor(
    seenThrough: number,
    private readonly save: (index: number) => Promise<void>,
  ) {
    this.savedThrough = seenThrough;
    this.wantedThrough = seenThrough;
  }

  visit(index: number) {
    this.wantedThrough = Math.max(this.wantedThrough, index);
    return this.flush();
  }

  flush(): Promise<void> {
    if (this.flight) return this.flight;
    if (this.savedThrough >= this.wantedThrough) return Promise.resolve();
    this.flight = this.drain();
    return this.flight;
  }

  private async drain() {
    try {
      while (this.savedThrough < this.wantedThrough) {
        const next = this.savedThrough + 1;
        await this.save(next);
        this.savedThrough = next;
      }
    } finally {
      this.flight = undefined;
    }
  }
}
