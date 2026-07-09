import { A, asyncPipe, G, E, kindClass } from "@duplojs/utils";
import { SF } from "@duplojs/server-utils";
import { createGenerateMetadataKind } from "./kind";

export class GenerateMetadataWalkDirectoryError extends kindClass(
	createGenerateMetadataKind("walk-directory-error"),
	Error,
) {
	public constructor(
		public readonly path: string,
		public readonly error: SF.FileSystemLeft<"walk-directory">,
	) {
		super({}, `Failed to walk directory: "${path}"`);
	}
}

export class GenerateMetadataDirectoryEntryNameError extends kindClass(
	createGenerateMetadataKind("directory-entry-name-error"),
	Error,
) {
	public constructor(
		public readonly path: string,
		public readonly entry: SF.FileInterface | SF.FolderInterface | SF.UnknownInterface,
	) {
		super({}, `Failed to resolve directory entry name: "${path}"`);
	}
}

export interface FileStructure {
	name: string;
	files?: FileStructure[];
}

const collator = new Intl.Collator(
	"en-US-u-kn-true",
	{
		usage: "sort",
		sensitivity: "variant",
		numeric: false,
		ignorePunctuation: false,
	},
);

function sortFileStructures(
	fileStructures: FileStructure[],
): FileStructure[] {
	return A.sort(
		fileStructures,
		(entry1, entry2) => collator.compare(entry1.name, entry2.name),
	);
}

export async function getDirectoryFileStructure(
	directoryPath: string,
): Promise<FileStructure[]> {
	const resultWalkDirectory = await SF.walkDirectory(directoryPath);

	if (E.isLeft(resultWalkDirectory)) {
		throw new GenerateMetadataWalkDirectoryError(
			directoryPath,
			resultWalkDirectory,
		);
	}

	return asyncPipe(
		E.unwrapRight(resultWalkDirectory),
		G.asyncReduce(
			G.reduceFrom<{
				folders: FileStructure[];
				files: FileStructure[];
			}>({
				folders: [],
				files: [],
			}),
			async({ element: entry, lastValue, nextWithObject }) => {
				const name = entry.getName();

				if (name === null) {
					throw new GenerateMetadataDirectoryEntryNameError(entry.path, entry);
				}

				if (SF.isFolderInterface(entry)) {
					return nextWithObject(
						lastValue,
						{
							folders: A.push(
								lastValue.folders,
								{
									name,
									files: await getDirectoryFileStructure(entry.path),
								},
							),
						},
					);
				}

				return nextWithObject(
					lastValue,
					{
						files: A.push(lastValue.files, { name }),
					},
				);
			},
		),
		({ folders, files }) => A.concat(
			sortFileStructures(folders),
			sortFileStructures(files),
		),
	);
}
