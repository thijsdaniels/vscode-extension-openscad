export interface ScadParameter {
	name: string;
	type: "number" | "boolean" | "string";
	group?: string;
	value: any;
	default?: any;
}
