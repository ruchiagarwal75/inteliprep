# Interviewer keyword and pattern inventory

Patterns route questions, evidence, pacing and diagram checks. They do not award technical scores. Core problem JSON is unchanged. GenAI additions apply through the track tag.

## src/lib/clarification-continuation.ts


```text
/[?？]/u
```

```text
/^(?:how|what|which|can|could|should|do|does|is|are)\b/iu
```

```text
/\d/u
```

```text
/\b(?:estimat\w*|calculat\w*|works? out|i get|assuming|budget|provision|allocate)\b/iu
```

```text
/\b(?:bytes?|[kmgt]i?b|qps|rps|requests?|creates?|reads?|writes?|keys?|counters?|per second|per day|servers?|machines?)\b|\d\s*[kmgt]i?b\b|\/s\b/iu
```

```text
/\b(?:qps|rps|requests? per second|arithmetic|calculate.*(?:rate|traffic))\b/iu
```

```text
/\b(?:estimate|calculate|how much|how many|how large|how big|size|provision|capacity|needed)\b/iu
```

```text
/\b(?:memory|ram|disk|storage|bandwidth|capacity|cache|counters?|machines?|servers?|instances?)\b/iu
```

## src/lib/configured-clarifications.ts


```text
/[?？]/u
```

```text
/^(?:what|how|when|where|why|which|is|are|does|do|can|could|would|should)\b/iu
```

```text
/^(?:how (?:would|should|can|do|will) (?:i|we|you)\b|should (?:i|we) (?:add|use|implement|choose|scale)\b)/iu
```

```text
/\s+/gu
```

## src/lib/clarification-parts.ts


```text
/[?？;]\s*|,\s*(?:and\s+)?(?=(?:what|how|which|when|where|who|is|are|do|does|can|could|should)\b)|\band\s+(?=(?:what|how|which|when|where|who|is|are|do|does|can|could|should)\b)/iu
```

## src/lib/genai-components.ts


```text
/\b(?:vector\s*(?:db|database|store|index)|embeddings?\s*store|pgvector|pinecone)\b/iu
```

```text
/\b(?:embedding service|embedder)\b/iu
```

```text
/\b(?:llm|inference(?: server)?|model server|gpu cluster|language model|large model|small model)\b|(?<!embedding )(?<!data )(?<!cost )(?<!threat )\bmodel\b/iu
```

```text
/\b(?:reranker|rerank(?:ing)? service|cross[- ]encoder)\b/iu
```

```text
/\b(?:guardrails?|moderation|safety filter)\b/iu
```

```text
/\btool (?:registry|executor)\b/iu
```

```text
/\b(?:orchestrator|agent runner|planner)\b/iu
```

```text
/\b(?:eval|evaluation|judge)\b/iu
```

```text
/\b(?:prompt builder|context builder)\b/iu
```

```text
/\b(?:document|email|tool (?:output|result)|retrieved (?:content|text)|prompt injection)\b[\s\S]*\b(?:what happens|what if|how (?:do|would|should)|untrusted|ignore|instructions|attack|block|defen\w*)\b/iu
```

## src/lib/genai-estimate-detection.ts


```text
/\b(?:tokens?|gpus?|gpu throughput|embeddings?|vectors?|index size|chunks?|context window|cost|model rate limits?|input|output|per request|per task|per minute|memory|ram|disk|storage|bandwidth)\b/iu
```

```text
/\d/u
```

```text
/[?？]\s*$/u
```

```text
/\b(?:estimat\w*|calculat\w*|assum\w*|roughly|about|need\w*|requires?|therefore|so|i get|works? out)\b/iu
```

## src/lib/genai-facts.ts


```text
/\b(?:stuck|unsure|not sure|don't know|do not know|help me|need help)\b/iu
```

```text
/[?？]/u
```

```text
/^(?:what|how|which|can|could|should)\b/iu
```

```text
/\d/u
```

## src/lib/diagram-review.ts


```text
/\b(?:app(?:lication)?\s*\d*|web(?: server)?\s*\d*|api(?: server)?\s*\d*)\b/iu
```

```text
/\b(?:orchestrator|agent runner|embedding service|embedder|model server|inference)\b/iu
```

```text
/\b(?:db|database|postgres(?:ql)?|mysql|mongo(?:db)?|data store)\b/iu
```

## src/lib/diagram-consistency.ts


```text
/\bpostgres(?:ql)?\b/iu
```

```text
/\bcassandra\b/iu
```

```text
/\bmysql\b/iu
```

```text
/\bmongo(?:db)?\b/iu
```

```text
/\bdynamodb\b/iu
```

```text
/[.!;,\n]/u
```

```text
/\b(?:not|instead of|rather than|replace|remove|without)\b/iu
```

```text
/\b(?:can|could|do) you (?:see|read|view) (?:my|the) (?:whiteboard|board|drawing|diagram)\b/iu
```

```text
/^unlabeled\b/iu
```

## src/lib/diagram-audit.ts


```text
/\b(?:load[- ]balancer|lb)\b/iu
```

```text
/\b(?:cdn|content delivery network)\b/iu
```

```text
/\bredis\b/iu
```

```text
/\b(?:message queue|kafka|rabbitmq|sqs)\b/iu
```

```text
/\bzookeeper\b/iu
```

```text
/(?<=[.!?])\s+|\n/gu
```

```text
/[?？]\s*$/u
```

## src/lib/diagram-component-copy.ts


```text
/\s+/gu
```

```text
/^unlabeled\b/iu
```

```text
/^unlabeled\s*/iu
```

```text
/rectangle/iu
```

## src/lib/diagram-label-copy.ts


```text
/\s+/gu
```

```text
/^unlabeled\b/iu
```

```text
/[.*+?^${}()|[\]\\]/gu
```

```text
/(?:["“‘'`]|\b(?:the|a|an|your)\s+)$/iu
```

## src/lib/probe-topics.ts


```text
/idempotenc|idempotency|same.{0,35}(?:request|key)/iu
```

```text
/base.?62|encod|decod|canonical/iu
```

```text
/cache|negative|ttl|invalidat|stale/iu
```

```text
/allocat|counter|leas|range|identifier|\bids?\b|zookeeper/iu
```

## src/lib/review-probes.ts


```text
/\s+/gu
```

```text
/what limitation of your current design|what (?:would you|do you) (?:like|want) to (?:examine|discuss|explore) next/iu
```

```text
/^(?:let['’]s|let us)\s+(?:discuss|review)\s+(?:my|the|this)\s+(?:design|drawing|diagram|architecture)[.!?\s]*$/iu
```

```text
/(?:let['’]s|let us|can we|could we|i['’]d like to|i want to|please)\s+(?:look at|focus on|discuss|explore|examine|go into)\b|^(?:provider outage|revocation|retries|failure recovery)$/iu
```

```text
/[?？]/u
```

```text
/[?？]/u
```

```text
/[?？][\s\S]*$/u
```

## src/lib/question-memory.ts


```text
/[a-z0-9]+/gu
```

```text
/^(?:what|how|does|would|will|your|you|the|a|an|to|of|in|is|it|when|if|and|do|can|this|that|for|with|are|be)$/u
```

```text
/((?<=[.!?])\s+)/u
```

```text
/^(?:you(?:['’]ve| have)? (?:explained|described|outlined|covered|identified|shown|highlighted|clarified)|your .{0,100}(?:indicates|shows|demonstrates|reflects|highlights|is (?:strong|good|clear))|thanks\b|thank you\b|great\b|good\b|excellent\b|(?:that|this)(?:['’]s| is) (?:a )?(?:good|great|clear|strong))/iu
```

```text
/\s+/u
```

```text
/[ \t]{2,}/gu
```

```text
/\s+/gu
```

## src/lib/open-question.ts


```text
/[?？]\s*$/u
```

```text
/(?<=[.!?])\s+|\n+/u
```

```text
/^(?:(?:yes|okay|ok|sure)[,!.]?\s+)?(?:please\b|feel free to\b|you can\b|choose\b|draw\b|sketch\b|explain\b|walk\b|end the interview\b|keep\b|take your time\b|go ahead\b|let.s stay on your design\b|continue\b|describe\b|tell me\b|review\b|confirm\b|clarify\b)/iu
```

```text
/\b(?:choose|select|click|use) (?:the )?["“]?Start drawing["”]?(?: (?:button|link))?/giu
```

```text
/\b(?:start|begin|continue|go ahead (?:and|with)|feel free to)\s+(?:(?:your|the)\s+)?(?:draw(?:ing)?|sketch(?:ing)?|designing)\b|\b(?:start|begin) (?:your |the )?(?:design|approach|architecture) by (?:drawing|sketching)\b|(?:^|[.!,:]\s*)(?:please )?(?:draw|sketch)\b|\b(?:move|turn) to (?:the |your )?whiteboard\b/iu
```

```text
/[?？]/u
```

```text
/^(?:write|ignore|system:|pause|wait|thanks|ok(?:ay)?\b)/iu
```

## src/lib/pending-question-reply.ts


```text
/\s+/gu
```

```text
/[?？]/gu
```

```text
/[_-]+/gu
```

```text
/\bid\b/giu
```

## src/lib/open-question-queue.ts


```text
/^[a-f0-9]{16}$/
```

```text
/\s+/gu
```

## src/lib/candidate-actions.ts


```text
/^(?:please\s+)?let me finish\b(?!\s+(?:my\s+)?(?:sketch|drawing))/u
```

```text
/^(?:i'm|i am) not (?:done|finished) explaining\b/u
```

```text
/^(?:please\s+)?(?:pause\b|wait\b|hold on\b|give me (?:a moment|some time|time|a break)\b|(?:don't|do not) (?:ask|review)\b|let me (?:draw|finish|keep drawing|take a break)\b)/u
```

```text
/^(?:i'm|i am|i) (?:still (?:drawing|working)|not (?:done|finished|ready)|need (?:some )?(?:time|a moment|a break)|want to (?:draw|keep drawing|take a break))\b/u
```

```text
/^(?:please )?(?:review|discuss|critique) (?:my|the|this) (?:drawing|diagram|sketch|design|architecture)\b/u
```

```text
/^(?:can|could) you (?:please )?(?:review|discuss) (?:my|the|this) (?:drawing|diagram|sketch|design|architecture)\b/u
```

```text
/^(?:let's|let us) (?:discuss|review|take questions)\b/u
```

```text
/^(?:i'm|i am) ready (?:for (?:questions|feedback|review)|to (?:discuss|take questions))\b/u
```

```text
/^(?:i'm|i am) (?:done|finished) (?:explaining|with my explanation)\b/u
```

```text
/^(?:i've|i have) (?:finished|completed) (?:my )?(?:explanation|explaining)\b/u
```

```text
/^that's my explanation\b/u
```

```text
/^(?:done|finished) explaining[.!\s]*$/u
```

```text
/^(?:i'm|i am) (?:ready to explain|done(?: drawing)?|finished(?: drawing)?|still explaining)\b/u
```

```text
/^(?:i've|i have) (?:finished|completed) (?:my )?(?:drawing|diagram|sketch)\b/u
```

```text
/^(?:let me explain|here(?:'s| is) my explanation)\b/u
```

```text
/^(?:done|ready)[.!\s]*$/u
```

```text
/^explain (?:my (?:design|drawing)|an update)[.!\s]*$/u
```

## src/lib/candidate-proposal.ts


```text
/(?:^|[.!?;:,]\s+)(?:(?:i|we)\s+(?:will|would|propose|suggest(?:ed)?|choose|plan to|intend to|assume|want to|prefer)|(?:i|we)['’](?:d|ll)\b|let['’]s\s+(?:use|keep|retain|store|target|assume|extend|change|set)|(?:can|could|may)\s+(?:i|we)\s+(?:use|keep|retain|store|target|assume|extend|change|set)|how about)\b/iu
```

```text
/\b(requirements?|scope|retention|retain\w*|(?:keep|keeping|store|storing)\s+(?:the\s+)?(?:posts?|messages?|history|data)\s+(?:for\s+)?(?:\d+|one|two|three|a)|latency|response.time|traffic|quota|limit.policy|freshness|staleness|delet\w*|durability)\b/iu
```

```text
/\b(propose|suggest(?:ed)?|assume|prefer|want to|like to|how about|instead|rather than|(?:can|could|may)\s+(?:i|we))\b|let['’]s\b/iu
```

```text
/\b(?:keep|keeping|retain|retaining|store|storing)\s+(?:the\s+)?(?:posts?|messages?|history|data)\s+(?:for\s+)?(?:\d+|one|two|three|a)\b|\b(?:target|set|allow|limit)\b[^.!?]{0,60}\d|^(?:\d+|one|a)\s+year(?:s|[- ]long)?\b.*\bretention\b/iu
```

```text
/\b(propos\w*|suggest\w*|recommend\w*|instead of|rather than|we need|we can|we should)\b/iu
```

```text
/^(?:keep|retain|store)\s+(?:the\s+)?(?:posts?|messages?|history|data)\b/iu
```

```text
/^(?:\d+|one|a)\s+year(?:s|[- ]long)?\b.*\bretention\b/iu
```

## src/lib/candidate-evidence.ts


```text
/^(?:hello|hi|hey|done|ready|please let me finish(?: before asking questions)?|(?:i've|i have|i'm|i am) (?:finished|done|still|not done) (?:explaining|drawing)|(?:i'm|i am) ready to explain (?:my|the) (?:design|drawing)|let's discuss(?: my design)?|please (?:hold|pause) questions(?: while i draw)?|(?:i'd|i would) like time to work on my drawing|(?:i'll|i will) explain now)[.!\s]*$/iu
```

## src/lib/candidate-echo.ts


```text
/[‘’]/gu
```

```text
/[“”]/gu
```

```text
/\s+/gu
```

```text
/\s+/u
```

```text
/[.*+?^${}()|[\]\\]/gu
```

```text
/\s+/u
```

```text
/“([^”]+)”|"([^"]+)"|'([^'\n]+)'/gu
```

```text
/^\s*>\s*(.+)$/gmu
```

```text
/^(?:You (?:said|wrote|described|explained)|Your (?:message|answer))\s*:\s*/iu
```

```text
/^[\s,;:]+/u
```

```text
/\s+/gu
```

## src/lib/off-topic.ts


```text
/^system\s*:/iu
```

```text
/^(?:(?:please|hey|hi)[,\s]+)?(?:(?:can|could|would|will)\s+you\s+)?(?:write|compose|generate|create|tell)\s+(?:(?:me|us|a|an|some|short|funny|little|the|beautiful|quick)\s+){0,6}(?:poem|poetry|song|story|joke|code|translation)\b/iu
```

```text
/^(?:(?:please|can you|could you)\s+)?translate\b/iu
```

```text
/ignore.{0,40}(?:instructions|rules)|(?:print|reveal|show).{0,30}(?:system prompt|hidden instructions)|^system\s*:|note to (?:the )?grader|give.{0,30}(?:4\/4|full credit)/iu
```

## src/lib/requirements-reply.ts


```text
/for the discussed traffic/giu
```

```text
/^(?:(?:yes|yeah|yep|ok(?:ay)?|sure|got it|understood|thanks|thank you|great|perfect|sounds good|all right|alright)(?:[\s,.!]+|$))+$/iu
```

## src/lib/interviewer-reply-filter.ts


```text
/^\s*(?:#{1,6}\s+|\d+[.)](?:\s+|$)|[-*+]\s+)/gmu
```

```text
/\*\*([^*\n]+)\*\*|__([^_\n]+)__/gu
```

```text
/`([^`\n]+)`/gu
```

```text
/(?<!\w)\*([^*\n]+)\*/gu
```

```text
/\[([^\]]+)\]\([^)]+\)/gu
```

```text
/^[^.!?？\n]+:$/u
```

```text
/[?？]/u
```

```text
/^\s*(["“])/u
```

```text
/[?？]|[.!](?=\s)|\n/u
```

## src/lib/grading-opportunity.ts


```text
/(?<=[.!?？])\s+/u
```

```text
/[?？]/u
```

## src/lib/grading-evidence.ts


```text
/\s+/u
```

```text
/^(?:in your final diagram|diagram reference|evidence)\s*:/iu
```

## src/lib/scorecard-calibration.ts


```text
/\b(cpu|processor|memory|ram|disk|i\/o|database|queries|query|network|profil\w*|saturat\w*|resource usage|slow (?:request|operation)|trace\w*)\b/iu
```

```text
/\b(measur\w*|check\w*|monitor\w*|profil\w*|test\w*|bottleneck|limit\w*|saturat\w*|utilization|cause|bound|slow|load)\b/iu
```

## src/lib/exact-sentences.ts


```text
/[.!?](?:["'’”)\]]*)(?=\s|$)/gu
```

```text
/(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)|\b[A-Z])\.$/u
```

## src/lib/interview-progress.ts


```text
/[?？]/u
```

```text
/^(?:what|how|when|where|why|which|is|are|does|do|can|could|would|should)\b/iu
```

## Problem configuration: ai-chat-assistant

- rubric assessment: `{"assessmentPattern":"requirement|scope|users|messages|tokens|gpus?|capacity|estimate|throughput|latency|limits?"}`
- rubric assessment: `{"assessmentPattern":"chat service|conversation|history|context|summari|truncat|prompt|partition|storage"}`
- rubric assessment: `{"assessmentPattern":"inferen|stream|sse|websocket|reconnect|resume|prefill|decode|batch|kv.cache|gpu"}`
- rubric assessment: `{"assessmentPattern":"overload|fail|retry|retries|timeout|queue|priority|rate.limit|full|degrad|warm|launch|surge|capacity"}`
- rubric assessment: `{"assessmentPattern":"tier|free|paid|routing|large model|small model|cost|budget|canary|rollout|rollback|region"}`
- rubric assessment: `{"assessmentPattern":"eval|quality|test|regression|canary|gate|rollback|rollout|metric|success"}`
- rubric assessment: `{"assessmentPattern":"moderat|safety|security|auth|user.{0,20}(?:isola|boundary)|delete|residen|region|private"}`
- review probes: `{"topicPattern":"stream|reconnect|resume","requiresPattern":"stream|sse|websocket"}`
- review probes: `{"topicPattern":"gpu|batch|kv.cache","requiresPattern":"gpu|inference|model server"}`
- review probes: `{"topicPattern":"overload|capacity|degrad","requiresPattern":"gpu|inference|model server"}`
- review probes: `{"topicPattern":"history|context","requiresPattern":"context|history|prompt"}`
- review probes: `{"topicPattern":"tokens?|rate.limit","requiresPattern":"token|rate.limit|gateway"}`
- review probes: `{"topicPattern":"moderat|safety"}`
- review probes: `{"topicPattern":"gpu|failure","requiresPattern":"gpu|inference|model server"}`
- review probes: `{"topicPattern":"eval|quality|rollout"}`
- review probes: `{"topicPattern":"eval|canary|rollback","requiresPattern":"canary|rollout|new model|router"}`
- review probes: `{"topicPattern":"cost|tiers?|budget"}`
- GenAI facts: `{"pattern":"daily active users|dau|how many.{0,20}users|user (?:count|scale)|how much traffic"}`
- GenAI facts: `{"pattern":"messages per user|messages? (?:does|will|should).{0,15}(?:each|a|one) user|user.{0,15}messages.{0,15}day"}`
- GenAI facts: `{"pattern":"peak|burst|peak factor"}`
- GenAI facts: `{"pattern":"(?:third.party|self.host|own).{0,20}(?:model|gpu)|(?:which|what).{0,15}(?:model|provider)(?!\\s+(?:account|rate|limits?))|where.{0,15}(?:run|host)|upcoming|launch|surge"}`
- GenAI facts: `{"pattern":"provider.{0,20}limits?|account.{0,20}limits?|requests? per second limit|tokens per minute limit|model rate limits?"}`
- GenAI facts: `{"pattern":"gpu.{0,20}(?:capacity|available|limit|budget|add|warm|load)|(?:available|fixed).{0,15}gpus|new node|warm.up"}`
- GenAI facts: `{"pattern":"gpu throughput|tokens.{0,15}(?:per gpu|gpu per second)|gpu.{0,20}(?:throughput|tokens per second)|throughput.{0,15}gpu"}`
- GenAI facts: `{"pattern":"tokens per (?:message|request)|(?:input|output|history|prompt).{0,15}tokens|token counts"}`
- GenAI facts: `{"pattern":"latency|first.token|response time|how (?:fast|quick)"}`
- GenAI facts: `{"pattern":"tiers?|free|paid|per.user.{0,15}limit|subscription"}`
- GenAI facts: `{"pattern":"history.{0,20}(?:retain|keep|delet|storage)|retention|how long|in.region|residen"}`
- GenAI facts: `{"pattern":"moderation|safety|security requirement|harmful"}`
- GenAI assumptions: `{"pattern":"(?:bytes|kb|size|storage).{0,30}(?:per message|each message|stored message)|message.{0,30}(?:size|bytes|kilobytes)|how (?:big|large).{0,25}message"}`

## Problem configuration: chat-service

- clarifications: `{"pattern":"\\b(traffic|rps|qps|scale|capacity|latency|response.time|users? per|messages? per|delivery.time|how (?:fast|quickly))\\b"}`
- clarifications: `{"pattern":"\\b(scope|group\\w*|attachment\\w*|video|voice|typing|read.receipt\\w*|authentication|participant\\w*|privacy|permission\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(guarantee\\w*|acknowledg\\w*|durab\\w*|order\\w*|retry|retries|duplicate\\w*|retention|retain\\w*|history|offline|consistency|stale|staleness)\\b"}`
- clarifications: `{"pattern":"\\b(delay\\w*|few seconds|show up|appear|visible)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|traffic|users? per|messages? per|connections?|throughput|latency|retention|90 days|200 milliseconds|1 second)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(api|endpoint\\w*|send|history|paginat\\w*|cursor\\w*|message.id\\w*|conversation.id\\w*|database|stor\\w*|durab\\w*|acknowledg\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(deliver\\w*|online|offline|reconnect\\w*|disconnect\\w*|websocket\\w*|poll\\w*|push|cursor\\w*|catch.up|backpressure|slow.client\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(order\\w*|sequence\\w*|concurren\\w*|retry|retries|duplicate\\w*|dedup\\w*|idempot\\w*|participant\\w*|authoriz\\w*|permission\\w*|access.control|privacy)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(scal\\w*|partition\\w*|shard\\w*|ownership|fail\\w*|outage\\w*|recover\\w*|replic\\w*|monitor\\w*|metric\\w*|backlog|cost\\w*|trade.off\\w*|retention)\\b"}`

## Problem configuration: enterprise-rag-assistant

- rubric assessment: `{"assessmentPattern":"requirement|scope|employees|documents|chunks|tokens|vector|gb|tb|estimate|latency|freshness"}`
- rubric assessment: `{"assessmentPattern":"connector|parse|pdf|tables|chunk|embed|retriev|keyword|hybrid|rerank|index"}`
- rubric assessment: `{"assessmentPattern":"query|prompt|context|stream|citations?|sources?|ground|abstain|latency"}`
- rubric assessment: `{"assessmentPattern":"fresh|edit|delet|revok|sync|failure|outage|rate.limit|migration|re.embed|downtime"}`
- rubric assessment: `{"assessmentPattern":"cost|cents|budget|tracing|trace|audit|platform|roadmap|routing|smaller|trust"}`
- rubric assessment: `{"assessmentPattern":"eval|quality|recall|groundedness|judge|human|test set|regression|label|metric"}`
- rubric assessment: `{"assessmentPattern":"permission|acl|auth|revok|nested|injection|untrusted|cache|security|residen|region"}`
- review probes: `{"topicPattern":"permission|acl|revok"}`
- review probes: `{"topicPattern":"permission|acl|revok","requiresPattern":"permission|acl|sync|retriev"}`
- review probes: `{"topicPattern":"chunk|table|heading","requiresPattern":"chunk|parse|pdf"}`
- review probes: `{"topicPattern":"retriev|keyword|vector|hybrid","requiresPattern":"retriev|keyword|vector|search"}`
- review probes: `{"topicPattern":"rerank|latency","requiresPattern":"rerank|cross.encoder"}`
- review probes: `{"topicPattern":"eval|quality|metric"}`
- review probes: `{"topicPattern":"retriev|abstain|evidence","requiresPattern":"retriev|search|index"}`
- review probes: `{"topicPattern":"injection|untrusted|safety"}`
- review probes: `{"topicPattern":"embedding|migration","requiresPattern":"embed|vector"}`
- review probes: `{"topicPattern":"cache|caching","requiresPattern":"cache|caching"}`
- review probes: `{"topicPattern":"vector|index|outage","requiresPattern":"vector|pgvector|pinecone"}`
- review probes: `{"topicPattern":"llm|model|rate.limit","requiresPattern":"llm|model|inference"}`
- review probes: `{"topicPattern":"cost|budget"}`
- GenAI facts: `{"pattern":"how many.{0,25}(?:employees|users)|(?:employee|user) (?:count|population)|business units"}`
- GenAI facts: `{"pattern":"how many (?:total )?(?:documents|docs|sources)(?! (?:change|update))|(?:document|corpus) (?:count|volume|size)|sources? (?:count|types?)"}`
- GenAI facts: `{"pattern":"questions? per day|daily.{0,20}(?:questions|traffic)|how (?:much|many).{0,25}(?:traffic|questions)|peak|qps"}`
- GenAI facts: `{"pattern":"(?:doc(?:ument)?|edit|content).{0,30}(?:change|update|fresh|delay|appear)|freshness|how often.{0,20}(?:docs|documents)"}`
- GenAI facts: `{"pattern":"revok|removed access|permission changes|access changes|permission.{0,20}(?:sync|fresh)|residen|in.region"}`
- GenAI facts: `{"pattern":"restricted|nested groups|different permissions|(?:how many|percent|percentage|proportion).{0,25}(?:private|permission)"}`
- GenAI facts: `{"pattern":"latency|first token|full answer|response time|how (?:fast|quick).{0,25}(?:answer|respond|response|generat)"}`
- GenAI facts: `{"pattern":"cost target|budget|(?:target|limit).{0,15}cost|how (?:much|expensive).{0,20}(?:cost|question)"}`
- GenAI facts: `{"pattern":"languages?|english|multilingual"}`
- GenAI facts: `{"pattern":"today|current (?:system|search)|existing (?:system|search)|starting point"}`
- GenAI facts: `{"pattern":"chunks? per (?:doc|document)|average.{0,20}chunks|how many chunks.{0,20}document"}`
- GenAI facts: `{"pattern":"dimensions?|dimensional|embedding.{0,15}width"}`
- GenAI facts: `{"pattern":"(?:input|output|prompt|answer) tokens|tokens per (?:question|request)|average.{0,20}tokens"}`
- GenAI assumptions: `{"pattern":"bytes per (?:float|value|dimension)|float.{0,20}bytes|vector.{0,25}(?:precision|representation)|(?:float32|float16|quantiz)"}`

## Problem configuration: file-storage

- clarifications: `{"pattern":"\\b(traffic|rps|qps|load|volume|scale|capacity|latency|response.time|file.sizes?|uploads? per|downloads? per|how (?:many|large|fast|quickly))\\b"}`
- clarifications: `{"pattern":"\\b(scope|channels?|features?|sharing|public|private|permission\\w*|preferences?|opt.out|live.streaming|recommend\\w*|folder.sync)\\b"}`
- clarifications: `{"pattern":"\\b(guarantee\\w*|durab\\w*|complet\\w*|retry|retries|duplicate\\w*|idempot\\w*|version\\w*|conflict\\w*|retention|retain\\w*|cleanup|revok\\w*|revocation)\\b"}`
- clarifications: `{"pattern":"\\b(two.devices|simultaneous|at.once|concurren\\w*|compare.and.set|cas|optimistic|conflict\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|volume|traffic|uploads? per|downloads? per|file.size|latency|retention|estimate\\w*|capacity)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(upload\\w*|resum\\w*|part\\w*|chunk\\w*|checksum\\w*|integrity|complet\\w*|durab\\w*|publish\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(metadata|version\\w*|owner\\w*|conflict\\w*|concurren\\w*|stale|replace\\w*|compare.and.set|compare.and.swap|cas|optimistic|base.version|upload.id|idempot\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(download\\w*|sharing|shared|read.grant|permission\\w*|authoriz\\w*|revok\\w*|revocation|ticket\\w*|access)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(scal\\w*|cleanup|garbage|orphan\\w*|abandon\\w*|recover\\w*|fail\\w*|throughput|egress|cost\\w*|monitor\\w*|metric\\w*|load.test)\\b"}`
- review probes: `{"topicPattern":"outage|provider|unavailable|storage.failure"}`
- review probes: `{"topicPattern":"outage|provider|unavailable|storage.failure"}`
- review probes: `{"topicPattern":"publish\\w*|metadata|complete|partial|incomplete|pending"}`
- review probes: `{"topicPattern":"revok\\w*|revocation|grant|presigned|signed.url|60.second"}`
- review probes: `{"topicPattern":"revok\\w*|revocation|grant|presigned|signed.url|60.second"}`
- review probes: `{"topicPattern":"version|conflict|compare.and.set|stale|concurrent"}`
- review probes: `{"topicPattern":"cleanup|abandon\\w*|slow.upload|progress"}`
- review probes: `{"topicPattern":"checksum|integrity|resum\\w*|upload.part"}`
- review probes: `{"topicPattern":"popular|large.file|bandwidth|throughput|egress"}`

## Problem configuration: news-feed

- clarifications: `{"pattern":"\\b(traffic|workload|rps|qps|scale|capacity|latency|response.time|daily.active|how.many|users? per|posts? per|reads? per|followers?|popular|celebrity|fresh\\w*|stale|staleness|delay\\w*|few seconds)\\b","sharedAnswerPattern":"daily active users[\\s\\S]*feed reads below 500 milliseconds[\\s\\S]*posts may take up to 5 seconds","sharedAnswerPatterns":{"mid":"(?=[\\s\\S]*(?:\\b(?:100000|1000000)\\b[^.!?\\n]{0,65}\\b(?:users?|dau|posts?|reads?)\\b|\\b(?:users?|dau|posts?|reads?)\\b[^.!?\\n]{0,65}\\b(?:100000|1000000)\\b))(?=[\\s\\S]*\\b500ms\\b)(?=[\\s\\S]*\\b5000ms\\b)","senior":"(?=[\\s\\S]*(?:\\b(?:10000000|100000000)\\b[^.!?\\n]{0,65}\\b(?:users?|dau|posts?|reads?)\\b|\\b(?:users?|dau|posts?|reads?)\\b[^.!?\\n]{0,65}\\b(?:10000000|100000000)\\b))(?=[\\s\\S]*\\b500ms\\b)(?=[\\s\\S]*\\b5000ms\\b)","staff":"(?=[\\s\\S]*(?:\\b(?:100000000|1000000000)\\b[^.!?\\n]{0,65}\\b(?:users?|dau|posts?|reads?)\\b|\\b(?:users?|dau|posts?|reads?)\\b[^.!?\\n]{0,65}\\b(?:100000000|1000000000)\\b))(?=[\\s\\S]*\\b500ms\\b)(?=[\\s\\S]*\\b5000ms\\b)"}}`
- clarifications: `{"pattern":"\\b(scope|rank\\w*|recommend\\w*|public|private|media|video|image\\w*|comment\\w*|advert\\w*|notification\\w*|authentication|follow.graph)\\b"}`
- clarifications: `{"pattern":"\\b(durab\\w*|acknowledg\\w*|guarantee\\w*|retention|retain\\w*|delet\\w*|consistency|publish.success|successful.publish)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|traffic|users? per|posts? per|reads? per|throughput|latency|freshness|retention|retain\\w*|keep(?:ing)?\\s+posts?|one.year|estimate\\w*|capacity)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(api|endpoint\\w*|publish\\w*|post.id\\w*|author\\w*|follow\\w*.graph|database|stor\\w*|durab\\w*|source.of.truth|derived)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(feed|timeline|paginat\\w*|cursor\\w*|offset\\w*|chronolog\\w*|order\\w*|merge\\w*|sort\\w*|continuation|tie.break\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(fan.?out|push|pull|hybrid|amplif\\w*|popular|celebrit\\w*|hot.\\w*|scal\\w*|partition\\w*|shard\\w*|fresh\\w*|propagat\\w*|lag|backlog|queue\\w*|\\d[\\d,]*(?:\\.\\d+)?\\s*(?:[km]|thousand|million|billion)?(?:[-\\s]+followers?))\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(fail\\w*|outage\\w*|recover\\w*|rebuild\\w*|replay\\w*|duplicate\\w*|idempot\\w*|delet\\w*|tombstone\\w*|monitor\\w*|metric\\w*|test\\w*|cost\\w*|trade.off\\w*)\\b"}`

## Problem configuration: notification-system

- clarifications: `{"pattern":"\\b(traffic|rps|qps|load|volume|scale|capacity|peak|rate|latency|response.time|notifications? per|dispatch.time|how (?:many|fast|quickly))\\b"}`
- clarifications: `{"pattern":"\\b(scope|channels?|features?|sharing|public|private|permission\\w*|preferences?|opt.out|live.streaming|recommend\\w*|folder.sync)\\b"}`
- clarifications: `{"pattern":"\\b((?:email|push).*(?:split|mix|ratio)|(?:split|mix|ratio).*(?:email|push))\\b"}`
- clarifications: `{"pattern":"\\b(idempot\\w*|duplicate\\w*|same.logical|repeat\\w*.request)\\b"}`
- clarifications: `{"pattern":"\\b(guarantee\\w*|acknowledg\\w*|durab\\w*|accept\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(retry|retries|uncertain\\w*|timeout\\w*|exactly.once|provider.outcome\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(retention|retain\\w*|status.history)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|volume|traffic|peak\\w*|rate|requests? per|channel.attempt\\w*|latency|dispatch.(?:time|delay)|timing|estimate\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(api|submit\\w*|accept\\w*|job\\w*|durab\\w*|state|status|notification.id|database|stor\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(channel\\w*|dispatch\\w*|email|push|provider\\w*|preference\\w*|opt.out|skipp\\w*|authoriz\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(retry|retries|timeout\\w*|uncertain\\w*|ambig\\w*|duplicate\\w*|dedup\\w*|idempot\\w*|exactly.once|permanent|transient)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(scal\\w*|fail\\w*|recover\\w*|backlog|backpressure|quota\\w*|fair\\w*|monitor\\w*|metric\\w*|cost\\w*|load.test|worker\\w*)\\b"}`
- review probes: `{"topicPattern":"outage|unavailable|provider.*down|provider.failure"}`
- review probes: `{"topicPattern":"outage|unavailable|provider.*down|recover\\w*|backlog"}`
- review probes: `{"topicPattern":"timeout|uncertain|acknowledg\\w*|lost.response"}`
- review probes: `{"topicPattern":"status|caller|access|authoriz\\w*"}`
- review probes: `{"topicPattern":"retry|retries|deadline|expir\\w*"}`
- review probes: `{"topicPattern":"fair\\w*|quota|rate.limit|overload|burst"}`
- review probes: `{"topicPattern":"preference|opt.out|disabled"}`

## Problem configuration: rate-limiter

- clarifications: `{"pattern":"\\b(traffic|rps|qps|scale|capacity|latency|response.time|quota|policy|window|burst\\w*|requests? per)\\b"}`
- clarifications: `{"pattern":"\\b(scope|identity|api.key\\w*|authentication|ip.address\\w*|region\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(exceed\\w*|denied|reject\\w*|429|retry.after|fail\\w*|unavailab\\w*|outage\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(stale|staleness|consistency|concurren\\w*|simultaneous)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|policy|quota|rolling|window|traffic|throughput|capacity|latency|keys? per|checks? per|requests? per)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(algorithm|rolling|window|bucket|timestamp\\w*|counter\\w*|quota|admi\\w*|reject\\w*|429|retry.after|expir\\w*|boundar\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(api.server\\w*|request.path|decision.path|state|storage|redis|database|lookup\\w*|look.up\\w*|ttl|expir\\w*|partition\\w*|shard\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(concurren\\w*|atomic\\w*|race\\w*|simultaneous|consisten\\w*|timeout\\w*|fail\\w*|unavailab\\w*|over.admi\\w*|retry|retries|overload\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(test\\w*|validat\\w*|measur\\w*|monitor\\w*|metric\\w*|observab\\w*|hot.key|clock\\w*|memory|cost\\w*|trade.off\\w*|state.growth)\\b"}`

## Problem configuration: single-server-scaling

- clarifications: `{"pattern":"\\b(traffic|requests? per second|rps|qps|latency|response.time|performance goals?|capacity)\\b","sharedAnswerPattern":"(?=[\\s\\S]*\\b10\\b)(?=[\\s\\S]*\\b1,?000\\b)(?=[\\s\\S]*\\b500\\s*(?:ms|milliseconds)\\b)"}`
- clarifications: `{"pattern":"\\b(stale|staleness|consistency)\\b|few seconds.*(delay|old|show|appear|visible)|\\b(updates?|changes?)\\b.{0,70}\\b(delay|late|seconds?|show up|appear|visible)\\b"}`
- clarifications: `{"pattern":"\\b(existing data|data.*preserv|retain.*data|data.*available)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(single|one (?:machine|server)|app(?:lication)?|database|data|web(?:site)?)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(bottleneck|cpu|processor|memory|ram|disk|i/o|query|queries|profil\\w*|saturat\\w*|resource|hotspot|server.{0,30}limit)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(add\\w*|scal\\w*|larger|two|balanc\\w*|cache|caching|replic\\w*|split\\w*|mov\\w*|vertical|horizontal|capacity|throughput|improv\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(availab\\w*|durab\\w*|preserv\\w*|correct\\w*|fail\\w*|crash\\w*|redundan\\w*|backup|migrat\\w*|rollout|rollback|continuit\\w*|lost|lose|keep.{0,40}working)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(load test|stress test|benchmark|verif\\w*|validat\\w*|before.{0,100}after|after.{0,100}before|check.{0,60}(?:result|improv|change|help\\w*|work\\w*)|(?:measur\\w*|monitor\\w*|metrics?).{0,80}(?:success|improv\\w*|after|compar\\w*|confirm\\w*)|(?:know|tell).{0,60}(?:help\\w*|work\\w*|improv\\w*))\\b"}`

## Problem configuration: url-shortener

- clarifications: `{"pattern":"\\b(traffic|requests? per second|rps|qps|scale|links per day|redirects per day)\\b"}`
- clarifications: `{"pattern":"\\b(access|authentication|public|retention|retain|expir|years)\\w*\\b"}`
- clarifications: `{"pattern":"\\b(stale|staleness|consistency)\\b|few seconds.*(delay|old|show|appear|visible)|\\b(updates?|changes?)\\b.{0,70}\\b(delay|late|seconds?|show up|appear|visible)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|traffic|latency|rps|qps|requests? per|links? per|redirects? per|throughput|availab\\w*|retention|access|public|workflow\\w*|creat\\w*.{0,30}link|submit\\w*.{0,30}url)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(identif\\w*|short.?code\\w*|unique\\w*|collisi\\w*|idempot\\w*|retr\\w*|hash\\w*|counter|random\\w*|base.?62|custom.alias\\w*|(?:unknown|expired).{0,20}link)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(api|endpoint\\w*|database|storage|mapping\\w*|lookup\\w*|look.?up\\w*|redirect\\w*|get|post|cache|caching|index\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(scal\\w*|capacity|bottleneck|traffic|rps|qps|throughput|distribut\\w*|shard\\w*|partition\\w*|balanc\\w*|replic\\w*|cache|caching|hot.{0,15}link|popular|fail\\w*|outage\\w*|crash\\w*|recover\\w*|consisten\\w*|region\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(trade.?off\\w*|instead|cost\\w*|complex\\w*|observab\\w*|monitor\\w*|logs?|alarm\\w*|metrics?|abuse|spam|rate.?limit\\w*|analytic\\w*|migrat\\w*|rollout|rollback|evol\\w*|maintain\\w*|debug\\w*|operat\\w*)\\b"}`
- review probes: `{"topicPattern":"\\b(id\\w*|identifier\\w*|creat\\w*|leas\\w*|atomic)\\b"}`
- review probes: `{"topicPattern":"\\b(ids?|identifier\\w*|leas\\w*|range\\w*|short.?code\\w*|base.?62)\\b"}`
- review probes: `{"topicPattern":"\\b(idempotenc\\w*|retr\\w*|conditional|request.identity)\\b"}`
- review probes: `{"topicPattern":"\\b(lookup|look.up|redirect\\w*|mapping|read|cache)\\b"}`
- review probes: `{"topicPattern":"\\b(cassandra|consisten\\w*|write|durab\\w*|read|acknowledg\\w*)\\b"}`
- review probes: `{"topicPattern":"\\b(leas\\w*|range\\w*|allocat\\w*|ids?|identifier\\w*)\\b"}`

## Problem configuration: video-streaming

- clarifications: `{"pattern":"\\b(traffic|rps|qps|load|volume|scale|capacity|latency|response.time|concurrent|viewers?|uploads? per|source.size|bitrate|bandwidth|readiness|how (?:many|large|fast|quickly))\\b"}`
- clarifications: `{"pattern":"\\b(scope|channels?|features?|sharing|public|private|permission\\w*|preferences?|opt.out|live.streaming|recommend\\w*|folder.sync)\\b"}`
- clarifications: `{"pattern":"\\b(guarantee\\w*|durab\\w*|complet\\w*|retry|retries|duplicate\\w*|idempot\\w*|publish\\w*|publication|retention|retain\\w*|delet\\w*)\\b"}`
- clarifications: `{"pattern":"\\b(rebuffer\\w*|buffering|stall\\w*|playback.interrupt\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(requirement\\w*|scope|volume|traffic|concurrent|bitrate|bandwidth|capacity|estimate\\w*|latency|readiness|retention)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(upload\\w*|api|video.id|source|durab\\w*|accept\\w*|status|metadata|processing.work)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(process\\w*|encod\\w*|transcod\\w*|rendition\\w*|output\\w*|publish\\w*|manifest\\w*|lease\\w*|idempot\\w*|duplicate\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(playback|stream\\w*|seek\\w*|segment\\w*|bitrate|bandwidth|cdn|cache\\w*|deliver\\w*|startup|popular|buffer\\w*)\\b"}`
- rubric assessment: `{"assessmentPattern":"\\b(fail\\w*|recover\\w*|retry|retries|backlog|delet\\w*|monitor\\w*|metric\\w*|test\\w*|cost\\w*|egress|overload)\\b"}`

