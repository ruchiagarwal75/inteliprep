import "server-only";
import { drillDefinitionSchema } from "../definition";
/** Authored source: docs/play-content/rag-levels-1-2.md. Keep this module private. */
export const mathDrills = [
  {
    id: "rag-l2-01",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Raw vector storage",
    sample: false,
    placement: true,
    gapId: "rag-scale-units",
    prompt:
      "{docs} documents, about {chunks} chunks each, {dims}-dimension embeddings stored as 4-byte floats. How much raw vector storage, before index overhead?",
    why: "Keep the units consistent. docs x chunks x dims x 4 bytes.",
    math: {
      parameters: {
        docs: {
          kind: "range",
          min: 1000000,
          max: 20000000,
          step: 1000000,
        },
        chunks: {
          kind: "range",
          min: 5,
          max: 20,
          step: 1,
        },
        dims: {
          kind: "choices",
          values: [384, 768, 1024, 1536],
        },
      },
      expression: [
        {
          param: "docs",
        },
        {
          param: "chunks",
        },
        "multiply",
        {
          param: "dims",
        },
        "multiply",
        4,
        "multiply",
        1000000000.0,
        "divide",
      ],
      formula: "docs x chunks x dims x 4 bytes / 1,000,000,000 gives GB",
      canonicalUnit: "GB",
      units: [
        {
          id: "GB",
          label: "GB",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          docs: 5000000,
          chunks: 10,
          dims: 768,
        },
        answer: 153.6,
      },
    },
  },
  {
    id: "rag-l2-02",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Daily re-embedding volume",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "{docs} documents, {pct}% change every day, about {chunks} chunks each. How many chunks need re-embedding per day?",
    why: "Keep the units consistent. docs x pct/100 x chunks.",
    math: {
      parameters: {
        docs: {
          kind: "range",
          min: 1000000,
          max: 20000000,
          step: 1000000,
        },
        pct: {
          kind: "range",
          min: 1,
          max: 5,
          step: 1,
        },
        chunks: {
          kind: "range",
          min: 5,
          max: 20,
          step: 1,
        },
      },
      expression: [
        {
          param: "docs",
        },
        {
          param: "pct",
        },
        "multiply",
        100,
        "divide",
        {
          param: "chunks",
        },
        "multiply",
      ],
      formula: "docs x pct/100 x chunks",
      canonicalUnit: "chunks per day",
      units: [
        {
          id: "chunks per day",
          label: "chunks per day",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          docs: 5000000,
          pct: 2,
          chunks: 10,
        },
        answer: 1000000,
      },
    },
  },
  {
    id: "rag-l2-03",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Peak query rate",
    sample: false,
    placement: true,
    gapId: "rag-scale-units",
    prompt:
      "{q} questions per day. Peak traffic is {k}x the average. What's the peak rate?",
    why: "Keep the units consistent. q / 86,400 x k.",
    math: {
      parameters: {
        q: {
          kind: "range",
          min: 10000,
          max: 2000000,
          step: 10000,
        },
        k: {
          kind: "range",
          min: 2,
          max: 5,
          step: 1,
        },
      },
      expression: [
        {
          param: "q",
        },
        86400,
        "divide",
        {
          param: "k",
        },
        "multiply",
      ],
      formula: "q / 86,400 x k",
      canonicalUnit: "questions per second",
      units: [
        {
          id: "questions per second",
          label: "questions per second",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          q: 100000,
          k: 3,
        },
        answer: 3.4722222222222223,
      },
    },
  },
  {
    id: "rag-l2-04",
    topic: "rag",
    level: 2,
    type: "math",
    title: "LLM tokens per day",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "{q} questions per day. Each uses about {tin} input tokens and {tout} output tokens. How many total tokens per day?",
    why: "Keep the units consistent. q x (tin + tout).",
    math: {
      parameters: {
        q: {
          kind: "range",
          min: 10000,
          max: 2000000,
          step: 10000,
        },
        tin: {
          kind: "range",
          min: 1000,
          max: 8000,
          step: 500,
        },
        tout: {
          kind: "range",
          min: 200,
          max: 1000,
          step: 100,
        },
      },
      expression: [
        {
          param: "q",
        },
        {
          param: "tin",
        },
        {
          param: "tout",
        },
        "add",
        "multiply",
        1000000.0,
        "divide",
      ],
      formula: "q x (tin + tout) / 1,000,000 gives millions",
      canonicalUnit: "millions of tokens per day",
      units: [
        {
          id: "millions of tokens per day",
          label: "millions of tokens per day",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          q: 100000,
          tin: 4000,
          tout: 500,
        },
        answer: 450,
      },
    },
  },
  {
    id: "rag-l2-05",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Cost per question",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "Each question uses {tin} input tokens and {tout} output tokens. Input costs ${pin} per 1M tokens, output costs ${pout} per 1M tokens. What's the cost per question?",
    why: "Keep the units consistent. tin x pin/1M + tout x pout/1M.",
    math: {
      parameters: {
        tin: {
          kind: "range",
          min: 1000,
          max: 8000,
          step: 500,
        },
        tout: {
          kind: "range",
          min: 200,
          max: 1000,
          step: 100,
        },
        pin: {
          kind: "range",
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        pout: {
          kind: "range",
          min: 2,
          max: 20,
          step: 1,
        },
      },
      expression: [
        {
          param: "tin",
        },
        {
          param: "pin",
        },
        "multiply",
        {
          param: "tout",
        },
        {
          param: "pout",
        },
        "multiply",
        "add",
        10000,
        "divide",
      ],
      formula: "tin x pin/1M + tout x pout/1M x 100 gives cents",
      canonicalUnit: "cents per question",
      units: [
        {
          id: "cents per question",
          label: "cents per question",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          tin: 4000,
          tout: 500,
          pin: 1,
          pout: 4,
        },
        answer: 0.6,
      },
    },
  },
  {
    id: "rag-l2-06",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Monthly LLM cost",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "{q} questions per day at {c} cents per question. What's the monthly cost (30 days)?",
    why: "Keep the units consistent. q x 30 x c / 100.",
    math: {
      parameters: {
        q: {
          kind: "range",
          min: 10000,
          max: 2000000,
          step: 10000,
        },
        c: {
          kind: "range",
          min: 0.2,
          max: 5,
          step: 0.1,
        },
      },
      expression: [
        {
          param: "q",
        },
        30,
        "multiply",
        {
          param: "c",
        },
        "multiply",
        100,
        "divide",
      ],
      formula: "q x 30 x c / 100",
      canonicalUnit: "dollars per month",
      units: [
        {
          id: "dollars per month",
          label: "dollars per month",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          q: 100000,
          c: 0.6,
        },
        answer: 18000,
      },
    },
  },
  {
    id: "rag-l2-07",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Full re-embedding time",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "You switch embedding models and must re-embed {n} chunks. Each GPU embeds about {t} chunks per second. You have {g} GPUs. How long does it take?",
    why: "Keep the units consistent. n / (t x g) / 3,600.",
    math: {
      parameters: {
        n: {
          kind: "range",
          min: 10000000,
          max: 500000000,
          step: 10000000,
        },
        t: {
          kind: "range",
          min: 500,
          max: 5000,
          step: 500,
        },
        g: {
          kind: "range",
          min: 1,
          max: 16,
          step: 1,
        },
      },
      expression: [
        {
          param: "n",
        },
        {
          param: "t",
        },
        {
          param: "g",
        },
        "multiply",
        "divide",
        3600,
        "divide",
      ],
      formula: "n / (t x g) / 3,600",
      canonicalUnit: "hours",
      units: [
        {
          id: "hours",
          label: "hours",
          factor: 1,
        },
      ],
      exactInteger: false,
      example: {
        parameters: {
          n: 50000000,
          t: 2000,
          g: 4,
        },
        answer: 1.7361111111111112,
      },
    },
  },
  {
    id: "rag-l2-08",
    topic: "rag",
    level: 2,
    type: "math",
    title: "Index nodes needed",
    sample: false,
    placement: false,
    gapId: "rag-scale-units",
    prompt:
      "Raw vectors take {raw} GB. The index adds {ov}x overhead. Each node has {mem} GB of memory and you can use 75% of it. How many nodes do you need?",
    why: "Keep the units consistent. ceil(raw x ov / (mem x 0.75)).",
    math: {
      parameters: {
        raw: {
          kind: "range",
          min: 20,
          max: 2000,
          step: 20,
        },
        ov: {
          kind: "choices",
          values: [1.2, 1.5, 2],
        },
        mem: {
          kind: "choices",
          values: [32, 64, 128, 256],
        },
      },
      expression: [
        {
          param: "raw",
        },
        {
          param: "ov",
        },
        "multiply",
        {
          param: "mem",
        },
        0.75,
        "multiply",
        "divide",
        "ceil",
      ],
      formula: "ceil(raw x ov / (mem x 0.75))",
      canonicalUnit: "nodes",
      units: [
        {
          id: "nodes",
          label: "nodes",
          factor: 1,
        },
      ],
      exactInteger: true,
      example: {
        parameters: {
          raw: 153.6,
          ov: 1.5,
          mem: 64,
        },
        answer: 5,
      },
    },
  },
].map((value) => drillDefinitionSchema.parse(value));
