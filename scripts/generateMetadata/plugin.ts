import { asyncPipe, E, Path, kindClass } from "@duplojs/utils";
import { SF } from "@duplojs/server-utils";
import type { Plugin } from "rollup";
import { getDirectoryFileStructure } from "./getDirectoryFileStructure";
import { createGenerateMetadataKind } from "./kind";

export class MetadataGenerationError extends kindClass(
	createGenerateMetadataKind("generated-error"),
	Error,
) {
	public constructor(
		public readonly path: string,
		public readonly error: SF.FileSystemLeft<"write-json-file">,
	) {
		super({}, "Error during generate metadata file");
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

			const metadataPath = Path.resolveRelative([directory, metadataFileName]);

			const result = await asyncPipe(
				directory,
				getDirectoryFileStructure,
				(files) => ({
					name: packageName,
					files,
				}),
				(metadata) => SF.writeJsonFile(
					metadataPath,
					metadata,
					{ space: 2 },
				),
			);

			if (E.isLeft(result)) {
				throw new MetadataGenerationError(metadataPath, result);
			}
		},
	} as const satisfies Plugin;
}
