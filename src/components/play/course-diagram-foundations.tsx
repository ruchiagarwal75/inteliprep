import { ResponsiveCourseDiagram as Responsive } from "./course-diagram-frame";
import {
  DiagramArrow as Arrow,
  DiagramBox as Box,
} from "./course-diagram-parts";
import styles from "./course-diagram.module.css";

function Dimensions({ portrait }: { portrait: boolean }) {
  return portrait ? (
    <>
      <Arrow d="M44 242H302" x={302} y={242} />
      <Arrow d="M44 242V44" x={44} y={44} angle={-90} />
      <text x={52} y={24}>
        Dimension 2
      </text>
      <text x={182} y={272}>
        Dimension 1
      </text>
      <rect className={styles.notice} x={82} y={78} width={46} height={42} />
      <circle className={styles.dot} cx={96} cy={90} r={4} />
      <circle className={styles.dot} cx={109} cy={104} r={4} />
      <path className={styles.line} d="M96 86V58M113 108 164 132" />
      <text x={98} y={48} textAnchor="middle">
        Claim a chair
      </text>
      <text x={210} y={154} textAnchor="middle">
        <tspan x={210}>Furniture</tspan>
        <tspan x={210} dy={22}>
          reimbursement
        </tspan>
      </text>
      <circle className={styles.dot} cx={264} cy={222} r={4} />
      <text x={204} y={210} textAnchor="middle">
        Reset password
      </text>
      <Box
        x={8}
        y={294}
        width={304}
        height={60}
        labels={["2D toy example", "Real vectors have many coordinates"]}
      />
    </>
  ) : (
    <>
      <Box
        x={8}
        y={42}
        width={220}
        height={92}
        labels={["768 coordinates", "[0.20, 0.80, ...]", "One point per text"]}
      />
      <Arrow d="M292 152H662" x={662} y={152} />
      <Arrow d="M292 152V16" x={292} y={16} angle={-90} />
      <text x={304} y={22}>
        Dimension 2
      </text>
      <text x={540} y={180}>
        Dimension 1
      </text>
      <rect className={styles.notice} x={346} y={57} width={48} height={39} />
      <circle className={styles.dot} cx={360} cy={70} r={4} />
      <circle className={styles.dot} cx={376} cy={81} r={4} />
      <path className={styles.line} d="M360 66 390 40M380 85 402 102" />
      <text x={398} y={42}>
        Claim a chair
      </text>
      <text x={408} y={112}>
        Furniture reimbursement
      </text>
      <circle className={styles.dot} cx={572} cy={143} r={4} />
      <text x={520} y={137}>
        Reset password
      </text>
      <text x={8} y={172}>
        2D toy; learned axes have no named topics
      </text>
    </>
  );
}
export function EmbeddingDimensionsDiagram() {
  return (
    <Responsive
      label="Dimensions are learned coordinates, not named topics"
      desktop={<Dimensions portrait={false} />}
      portrait={<Dimensions portrait />}
      portraitHeight={366}
    />
  );
}

function Metrics({ portrait }: { portrait: boolean }) {
  const ox = portrait ? 30 : 24,
    oy = portrait ? 184 : 150,
    unit = portrait ? 116 : 126,
    top = portrait ? 244 : 42,
    columns = portrait ? [82, 166, 258] : [400, 504, 614];
  return (
    <>
      <Arrow
        d={`M${ox} ${oy}h${2 * unit + 24}`}
        x={ox + 2 * unit + 24}
        y={oy}
      />
      <Arrow
        d={`M${ox} ${oy}v${-unit - 24}`}
        x={ox}
        y={oy - unit - 24}
        angle={-90}
      />
      <Arrow
        d={`M${ox} ${oy} ${ox + 2 * unit} ${oy - unit}`}
        x={ox + 2 * unit}
        y={oy - unit}
        angle={-27}
      />
      <Arrow d={`M${ox} ${oy}h${unit}`} x={ox + unit} y={oy} tone="gold" />
      <text x={portrait ? 154 : 190} y={portrait ? 48 : 18}>
        B = [2, 1]
      </text>
      <text x={portrait ? 74 : 54} y={oy + 24}>
        Query = A = [1, 0]
      </text>
      {["Cosine", "Dot", "Distance"].map((label, index) => (
        <text key={label} x={columns[index]} y={top} textAnchor="middle">
          {label}
        </text>
      ))}
      <text x={portrait ? 12 : 332} y={top + 38}>
        A
      </text>
      <text x={portrait ? 12 : 332} y={top + 76}>
        B
      </text>
      {[
        ["1", "1", "0"],
        ["0.89", "2", "1.41"],
      ].map((values, row) =>
        values.map((value, column) => (
          <text
            key={`${row}-${column}`}
            x={columns[column]}
            y={top + 38 * (row + 1)}
            textAnchor="middle"
          >
            {value}
          </text>
        )),
      )}
      <text x={portrait ? 12 : 332} y={portrait ? 358 : 172}>
        Cosine picks A; raw dot picks B
      </text>
    </>
  );
}
export function VectorMetricExampleDiagram() {
  return (
    <Responsive
      label="The same query ranks two toy vectors differently under cosine and raw dot product"
      desktop={<Metrics portrait={false} />}
      portrait={<Metrics portrait />}
      portraitHeight={376}
    />
  );
}

function PdfPaths({ portrait }: { portrait: boolean }) {
  return portrait ? (
    <>
      <Box x={8} y={12} width={132} height={54} labels={["PDF with text"]} />
      <Box x={180} y={12} width={132} height={54} labels={["Scanned page"]} />
      <Arrow d="M74 66V98" x={74} y={98} angle={90} />
      <Arrow d="M246 66V98" x={246} y={98} angle={90} />
      <Box
        x={8}
        y={98}
        width={132}
        height={60}
        labels={["Extract text", "and positions"]}
      />
      <Box
        x={180}
        y={98}
        width={132}
        height={60}
        labels={["OCR", "Recognize text"]}
        notice
      />
      <Arrow d="M74 158V184H160V210" x={160} y={210} angle={90} />
      <Arrow d="M246 158V184H160V210" x={160} y={210} angle={90} />
      <Box
        x={58}
        y={210}
        width={204}
        height={58}
        labels={["Rebuild headings", "and table structure"]}
      />
      <Arrow d="M160 268V298" x={160} y={298} angle={90} />
      <Box
        x={58}
        y={298}
        width={204}
        height={48}
        labels={["Verify reading order"]}
      />
    </>
  ) : (
    <>
      <Box x={8} y={18} width={136} height={50} labels={["PDF with text"]} />
      <Box x={8} y={112} width={136} height={50} labels={["Scanned page"]} />
      <Arrow d="M144 43H174" x={174} y={43} />
      <Arrow d="M144 137H174" x={174} y={137} />
      <Box
        x={174}
        y={14}
        width={144}
        height={58}
        labels={["Extract text", "and positions"]}
      />
      <Box
        x={174}
        y={108}
        width={144}
        height={58}
        labels={["OCR", "Recognize text"]}
        notice
      />
      <Arrow d="M318 43H344V90H372" x={372} y={90} />
      <Arrow d="M318 137H344V90H372" x={372} y={90} />
      <Box
        x={372}
        y={54}
        width={144}
        height={72}
        labels={["Rebuild headings", "and tables"]}
      />
      <Arrow d="M516 90H542" x={542} y={90} />
      <Box
        x={542}
        y={54}
        width={130}
        height={72}
        labels={["Verify", "reading order"]}
      />
    </>
  );
}
export function PdfTextOrOcrDiagram() {
  return (
    <Responsive
      label="A scanned page needs optical character recognition; extracted text still needs structure and reading-order checks"
      desktop={<PdfPaths portrait={false} />}
      portrait={<PdfPaths portrait />}
      portraitHeight={360}
    />
  );
}

function ChunkOptions({ portrait }: { portrait: boolean }) {
  const width = portrait ? 188 : 474;
  const x = portrait ? 124 : 190;
  return (
    <>
      {["Fixed size", "Recursive", "Structure", "Semantic"].map((label, i) => {
        const y = (portrait ? 20 : 8) + i * (portrait ? 78 : 43);
        const cuts = [[0.25, 0.5, 0.75], [0.34, 0.7], [0.25, 0.66], [0.55]][i];
        return (
          <g key={label}>
            <text x={8} y={y + 22}>
              {label}
            </text>
            <rect
              className={styles.node}
              x={x}
              y={y}
              width={width}
              height={32}
            />
            {cuts.map((fraction) => (
              <path
                key={fraction}
                className={styles.line}
                d={`M${x + width * fraction} ${y}v32`}
              />
            ))}
            {i === 2 && (
              <rect
                className={styles.notice}
                x={x + width * 0.25}
                y={y}
                width={width * 0.41}
                height={32}
              />
            )}
          </g>
        );
      })}
      <text x={portrait ? 8 : 190} y={portrait ? 354 : 188}>
        Gold: a section stays together
      </text>
    </>
  );
}
export function ChunkStrategyOptionsDiagram() {
  return (
    <Responsive
      label="Fixed-size cuts are regular; recursive cuts prefer text boundaries; structure-aware cuts keep sections together; semantic cuts follow topic shifts. The intact section is gold."
      desktop={<ChunkOptions portrait={false} />}
      portrait={<ChunkOptions portrait />}
      portraitHeight={370}
    />
  );
}
