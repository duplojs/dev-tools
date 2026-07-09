import { createKindNamespace } from "@duplojs/utils";

declare module "@duplojs/utils" {
	interface ReservedKindNamespace {
		DuplojsDevToolsGenerateMetadata: true;
	}
}

export const createGenerateMetadataKind = createKindNamespace(
	// @ts-expect-error reserved kind namespace
	"DuplojsDevToolsGenerateMetadata",
);
