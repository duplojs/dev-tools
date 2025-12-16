import { G, A, S, O, pipe } from "@duplojs/utils";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "rollup";

export class IncludesDeclarationError extends Error {
	public constructor(
		public readonly declarationPath: string,
		public readonly catchError: unknown,
	) {
		super("Error during processing declaration includes");
	}
}

const includePattern = /^(?<indent>.*)\{@include (?<path>[A-z/.]+)(?:\[(?<startLine>[0-9]+),(?<endLine>[0-9]+)\])?\}/gm;

interface DeclarationIncludesParams {
	includedPath: string;
	lineChar?: string;
}

export function declarationIncludesPlugin(
	{
		includedPath,
		lineChar = "\n",
	}: DeclarationIncludesParams,
) {
	return {
		name: "duplojs-declaration-includes",
		async generateBundle(options, outputBundle) {
			void await pipe(
				outputBundle,
				O.values,
				A.filter(O.discriminate("type", "asset")),
				A.filter((asset) => S.endsWith(asset.fileName, ".d.ts")),
				G.asyncMap(
					async(asset) => {
						const source = asset.source.toString();

						asset.source = await pipe(
							source,
							S.matchAll(includePattern),
							G.asyncReduce(
								source,
								async({ lastValue, element, next }) => {
									const { path, startLine, endLine, indent } = element.groups ?? {};

									if (!path || !indent) {
										return next(lastValue);
									}

									const contentFile = await readFile(resolve(includedPath, path), "utf-8");

									return pipe(
										contentFile,
										S.split(lineChar),
										(lines) => {
											if (startLine && startLine) {
												const start = Number(startLine) - 1;
												const end = Number(endLine);

												return A.slice(lines, start, end);
											}

											return lines;
										},
										A.map((value) => `${indent}${value}`),
										A.join("\n"),
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
					},
				),
				G.execute,
			);
		},
	} as const satisfies Plugin;
}
