export type ParsedContextLine = {
  line: number;
  text: string;
};

export type JsonMetadataBlock = {
  startLine: number;
  endLine: number;
  value: unknown;
};

export type ParsedContextFile = {
  path: string;
  text: string;
  lines: ParsedContextLine[];
  metadataBlocks: JsonMetadataBlock[];
};

export function parseContextFile(input: { path: string; text: string }): ParsedContextFile {
  const lines = input.text.split(/\r?\n/).map((text, index) => ({
    line: index + 1,
    text
  }));

  return {
    path: input.path,
    text: input.text,
    lines,
    metadataBlocks: extractJsonMetadataBlocks(lines)
  };
}

function extractJsonMetadataBlocks(lines: ParsedContextLine[]): JsonMetadataBlock[] {
  const blocks: JsonMetadataBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || !line.text.trim().startsWith("```json semantic-agent")) {
      continue;
    }

    const jsonLines: string[] = [];
    let endLine = line.line;
    let terminated = false;

    for (let inner = index + 1; inner < lines.length; inner += 1) {
      const candidate = lines[inner];
      if (!candidate) {
        continue;
      }

      endLine = candidate.line;

      if (candidate.text.trim() === "```") {
        terminated = true;
        index = inner;
        break;
      }

      jsonLines.push(candidate.text);
    }

    if (!terminated) {
      blocks.push({
        startLine: line.line,
        endLine,
        value: { parseError: true, unterminated: true }
      });
      continue;
    }

    try {
      blocks.push({
        startLine: line.line,
        endLine,
        value: JSON.parse(jsonLines.join("\n")) as unknown
      });
    } catch {
      blocks.push({
        startLine: line.line,
        endLine,
        value: { parseError: true }
      });
    }
  }

  return blocks;
}
