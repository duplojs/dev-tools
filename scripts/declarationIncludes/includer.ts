import { A, pipe, S, G } from "@duplojs/utils";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export class RecursiveIncludeError extends Error {
	public constructor(
		public readonly path: string,
	) {
		super("Recursive include detected");
	}
}

interface IncluderParams {
	source: string;
	stack?: string[];
	includedPath: string;
	lineChar: string;
}

const includePattern = /^(?<indent>.*)\{@include (?<path>[A-z/.]+)(?:\[(?<startLine>[0-9]+),(?<endLine>[0-9]+)\])?\}/gm;

export async function includer(
	{
		source,
		stack = [],
		includedPath,
		lineChar,
	}: IncluderParams,
): Promise<string> {
	return pipe(
		source,
		S.matchAll(includePattern),
		G.asyncReduce(
			G.reduceFrom(source),
			async({ lastValue, element, next }) => {
				const { path, startLine, endLine, indent } = element.groups ?? {};

				if (!path || indent === undefined) {
					return next(lastValue);
				}

				const resolvedPath = resolve(includedPath, path);

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

				const expandedContent = await includer({
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
						A.at(element, 0),
						content,
					),
					next,
				);
			},
		),
	);
}
