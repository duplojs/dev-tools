import { G, A, S, O, pipe } from "@duplojs/utils";
import type { Plugin } from "rollup";
import { includer } from "./includer";

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

						asset.source = await includer({
							source,
							includedPath,
							lineChar,
						});
					},
				),
				G.execute,
			);
		},
	} as const satisfies Plugin;
}
