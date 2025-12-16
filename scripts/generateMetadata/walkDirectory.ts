import { A, asyncPipe, P, innerPipe, G, O } from "@duplojs/utils";
import { opendir } from "node:fs/promises";
import { join } from "node:path";

export interface FileStructure {
	name: string;
	files?: FileStructure[];
}

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
							name,
							files,
						}),
					),
				),
				P.otherwise(O.pick({ name: true })),
			),
		),
		A.from,
	);
}

