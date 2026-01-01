import { A, asyncPipe, P, innerPipe, G, O } from "@duplojs/utils";
import { opendir } from "node:fs/promises";
import { join } from "node:path";

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

export function walkDirectory(
	directoryPath: string,
): Promise<FileStructure[]> {
	return asyncPipe(
		opendir(directoryPath),
		G.asyncMap(
			innerPipe(
				P.when(
					(entry) => entry.isDirectory(),
					({ name }) => asyncPipe(
						join(directoryPath, name),
						walkDirectory,
						(files) => ({
							type: <const>"folder",
							name,
							files,
						}),
					),
				),
				P.otherwise(
					({ name }) => ({
						type: <const>"file",
						name,
					}),
				),
			),
		),
		A.from,
		O.to({
			folders: innerPipe(
				A.filter(O.discriminate("type", "folder")),
				A.sort((entry1, entry2) => collator.compare(entry1.name, entry2.name)),
			),
			files: innerPipe(
				A.filter(O.discriminate("type", "file")),
				A.sort((entry1, entry2) => collator.compare(entry1.name, entry2.name)),
			),
		}),
		({ folders, files }) => ([
			...folders,
			...files,
		]),
		A.map(O.omit({ type: true })),
	);
}
