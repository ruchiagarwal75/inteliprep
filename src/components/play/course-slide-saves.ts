/** Keep ordered server checkpoints off the slide navigation path. */
export class CourseSlideSaves {
  private savedThrough: number;
  private wantedThrough: number;
  private lastSavedIndex: number;
  private wantedIndex: number;
  private flight?: Promise<void>;

  constructor({
    seenThrough,
    lastViewedIndex,
    save,
  }: {
    seenThrough: number;
    lastViewedIndex: number;
    save: (index: number, lastViewedIndex: number) => Promise<void>;
  }) {
    this.savedThrough = seenThrough;
    this.wantedThrough = seenThrough;
    this.lastSavedIndex = lastViewedIndex;
    this.wantedIndex = lastViewedIndex;
    this.save = save;
  }
  private readonly save: (
    index: number,
    lastViewedIndex: number,
  ) => Promise<void>;

  visit(index: number) {
    this.wantedThrough = Math.max(this.wantedThrough, index);
    this.wantedIndex = index;
    return this.flush();
  }

  flush(): Promise<void> {
    if (this.flight) return this.flight;
    if (
      this.savedThrough >= this.wantedThrough &&
      this.lastSavedIndex === this.wantedIndex
    )
      return Promise.resolve();
    this.flight = this.drain();
    return this.flight;
  }

  private async drain() {
    try {
      while (
        this.savedThrough < this.wantedThrough ||
        this.lastSavedIndex !== this.wantedIndex
      ) {
        const next = Math.min(this.savedThrough + 1, this.wantedThrough),
          position = this.wantedIndex;
        await this.save(next, position);
        this.savedThrough = next;
        this.lastSavedIndex = position;
      }
    } finally {
      this.flight = undefined;
    }
  }
}
