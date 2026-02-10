import { A, pipe, S, G, Path } from "@duplojs/utils";
import { readFile } from "node:fs/promises";

export class RecursiveIncludeError extends Error {
	public constructor(
		public readonly path: string,
	) {
		super("Recursive include detected");
	}
}

interface ResolveIncludesParams {
	source: string;
	stack?: string[];
	includedPath: string;
	lineChar: string;
}

const includePattern = /^(?<indent>.*)\{@include (?<path>[A-z/.]+)(?:\[(?<startLine>[0-9]+),(?<endLine>[0-9]+)\])?\}/gm;

export async function resolveIncludes(
	{
		source,
		stack = [],
		includedPath,
		lineChar,
	}: ResolveIncludesParams,
): Promise<string> {
	return pipe(
		source,
		S.extractAll(includePattern),
		G.asyncReduce(
			G.reduceFrom(source),
			async({ lastValue, element, next }) => {
				const { path, startLine, endLine, indent } = element.namedGroups ?? {};

				if (!path || indent === undefined) {
					return next(lastValue);
				}

				const resolvedPath = Path.resolveRelative([includedPath, path]);

				if (A.includes(stack, resolvedPath)) {
					throw new RecursiveIncludeError(resolvedPath);
				}

				const contentFile = await readFile(resolvedPath, "utf-8");
				const slicedContent = pipe(
					contentFile,
					S.split(lineChar),
					(lines) => {
						if (startLine && endLine) {
							const start = Number(startLine) - 1;
							const end = Number(endLine);

							return A.slice(lines, start, end);
						}

						return lines;
					},
					A.join(lineChar),
				);

				const expandedContent = await resolveIncludes({
					source: slicedContent,
					stack: A.push(stack, resolvedPath),
					includedPath,
					lineChar,
				});

				return pipe(
					expandedContent,
					S.split(lineChar),
					A.map((value) => `${indent}${value}`),
					A.join(lineChar),
					(content) => S.replace(
						lastValue,
						element.matchedValue,
						content,
					),
					next,
				);
			},
		),
	);
}
