import "server-only";
import { retrievalDrills } from "./rag/retrieval";
import { mathDrills } from "./rag/scale-math";
import { permissionsDrills } from "./rag/permissions-freshness";
import { qualityDrills } from "./rag/quality-safety";
const drills = [
  ...retrievalDrills,
  ...mathDrills,
  ...permissionsDrills,
  ...qualityDrills,
];
export const drillsForTopic = (topic: string) =>
  drills.filter((drill) => drill.topic === topic);
