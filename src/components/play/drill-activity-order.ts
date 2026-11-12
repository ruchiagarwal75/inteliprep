/** Orders visibility updates only. Elapsed time is still computed by the server. */
export class DrillActivityOrder {
  private latest = 0;
  next(serverFloor = 0, now = Date.now()) {
    this.latest = Math.max(this.latest + 1, serverFloor + 1, now);
    return this.latest;
  }
}
