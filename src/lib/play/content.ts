import "server-only";
import { retrievalDrills } from "./rag/retrieval";
import { mathDrills } from "./rag/scale-math";
import { sampleDrills } from "./rag/samples";
const drills = [...retrievalDrills, ...mathDrills, ...sampleDrills];
export const drillsForTopic = (topic: string) =>
  drills.filter((drill) => drill.topic === topic);
