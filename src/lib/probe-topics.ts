type Probe = { id: string; question: string; topicPattern: string };

/** Related cache/ID probes share a turn budget, even if the wording changes. */
export function probeTopic(probe: Probe) {
  const text = probe.question + " " + probe.topicPattern;
  if (/idempotenc|idempotency|same.{0,35}(?:request|key)/iu.test(text))
    return "idempotency";
  if (/base.?62|encod|decod|canonical/iu.test(probe.question))
    return "id_encoding";
  if (/cache|negative|ttl|invalidat|stale/iu.test(text)) return "cache";
  if (/allocat|counter|leas|range|identifier|\bids?\b|zookeeper/iu.test(text))
    return "id_allocation";
  return probe.id;
}

export function availableTopicProbes<T extends Probe>(
  probes: T[],
  counts: Record<string, number> = {},
  requested?: string,
) {
  const eligible = probes.filter(
    (p) =>
      (counts[probeTopic(p)] ?? 0) < 3 ||
      Boolean(requested && new RegExp(p.topicPattern, "iu").test(requested)),
  );
  // Only deepen an exhausted topic after every other configured topic has had its chance.
  return eligible.length ? eligible : probes;
}

export function stageTopicCounts(
  counts: Record<string, number> = {},
  stageId: string,
) {
  const prefix = stageId + ":";
  return Object.fromEntries(
    Object.entries(counts)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, count]) => [key.slice(prefix.length), count]),
  );
}
