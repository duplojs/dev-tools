import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateMetadataPlugin } from "@duplojs/dev-tools/generateMetadata";

describe("generateMetadataPlugin", () => {
	let tempDir = "";

	beforeEach(async() => {
		tempDir = await mkdtemp(join(tmpdir(), "duplo-metadata-"));

		await mkdir(join(tempDir, "nested", "deep"), { recursive: true });

		const files = [
			{
				relative: "index.js",
				content: "console.log('root');",
			},
			{
				relative: "nested/util.js",
				content: "export const x = 1;",
			},
			{
				relative: "nested/deep/info.txt",
				content: "hello",
			},
		];

		await Promise.all(
			files.map(({ relative, content }) => writeFile(join(tempDir, relative), content)),
		);
	});

	afterEach(async() => {
		await rm(
			tempDir,
			{
				recursive: true,
				force: true,
			},
		);
	});

	it("captures nested structure", async() => {
		const plugin = generateMetadataPlugin({
			packageName: "@duplojs/dev-tools-integration",
		});

		await plugin.writeBundle.call({} as any, { dir: tempDir } as any);

		const result = await readFile(
			join(tempDir, "metadata.json"),
			"utf8",
		);

		expect(result).toMatchSnapshot();
	});
});
