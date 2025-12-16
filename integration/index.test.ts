import { spawnSync } from "child_process";
import { readFileSync } from "fs";

it("build rollup", () => {
	spawnSync("npm", ["-w", "integration", "run", "build"], { stdio: "inherit" });

	expect(readFileSync("integration/dist/mySuperDomain/mySuperFunction.d.ts", "utf-8")).toMatchSnapshot();
	expect(readFileSync("integration/dist/metadata.json", "utf-8")).toMatchSnapshot();
});
