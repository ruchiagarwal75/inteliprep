import "server-only";
import { z } from "zod";
import data from "./rag.json";
import { courseTopicSchema } from "./definition";
export const ragCourse = z.array(courseTopicSchema).parse(data);
export const courseTopic = (level: number) =>
  ragCourse.find((topic) => topic.level === level);
