import { asyncPipe, E, unwrap } from "@duplojs/utils";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Plugin } from "rollup";
import { walkDirectory } from "./walkDirectory";

export class MetadataGenerationError extends Error {
	public constructor(
		public readonly metadataPath: string,
		public readonly catchError: unknown,
	) {
		super("Error during generate metadata file");
	}
}

export interface GenerateMetadataPluginParams {
	metadataFileName?: string;
	packageName: string;
}

export function generateMetadataPlugin(
	{
		packageName,
		metadataFileName = "metadata.json",
	}: GenerateMetadataPluginParams,
) {
	return {
		name: "duplojs-generate-metadata",
		async writeBundle(outputOptions) {
			const directory = outputOptions.dir;

			if (!directory) {
				return;
			}

			const metadataPath = join(directory, metadataFileName);

			const result = await E.future(
				asyncPipe(
					directory,
					walkDirectory,
					(files) => ({
						name: packageName,
						files,
					}),
					(metadata) => writeFile(
						metadataPath,
						JSON.stringify(metadata, null, 2),
					),
				),
			);

			if (E.isLeft(result)) {
				throw new MetadataGenerationError(metadataPath, unwrap(result));
			}
		},
	} as const satisfies Plugin;
}
