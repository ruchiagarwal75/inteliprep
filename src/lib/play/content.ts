import "server-only";
import { courseDrills } from "./course/drills";
import { RAG_COURSE_ID } from "./course/metadata";
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
  topic === RAG_COURSE_ID
    ? courseDrills
    : drills.filter((drill) => drill.topic === topic);
