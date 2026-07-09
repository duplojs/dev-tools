import { createKindNamespace } from "@duplojs/utils";

declare module "@duplojs/utils" {
	interface ReservedKindNamespace {
		DuplojsDevToolsDeclarationIncludes: true;
	}
}

export const createDeclarationIncludesKind = createKindNamespace(
	// @ts-expect-error reserved kind namespace
	"DuplojsDevToolsDeclarationIncludes",
);
