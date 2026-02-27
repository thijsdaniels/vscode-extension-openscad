import { readFile } from "fs/promises";
import { OutputChannel } from "vscode";
import { ScadParameter } from "../../shared/types/parameters";

export class ScadParser {
  constructor(private logger: OutputChannel) {}

  public async extractParameters(scadPath: string): Promise<ScadParameter[]> {
    try {
      const content = await readFile(scadPath, "utf8");
      const params: ScadParameter[] = [];
      let currentGroup = "";
      let moduleDepth = 0;

      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments that aren't group markers
        if (!trimmed || (trimmed.startsWith("//") && !trimmed.includes("/*"))) {
          continue;
        }

        // Track module scope using brace counting
        if (trimmed.startsWith("module")) {
          moduleDepth++;
        }
        // Count all braces in the line
        moduleDepth += (trimmed.match(/\{/g) || []).length;
        moduleDepth -= (trimmed.match(/\}/g) || []).length;

        // Skip if we're inside any module
        if (moduleDepth > 0) {
          continue;
        }

        // Check for parameter group comments
        if (trimmed.startsWith("/*")) {
          const groupMatch = trimmed.match(/\/\*\s*\[(.*?)\]\s*\*\//);
          if (groupMatch) {
            currentGroup = groupMatch[1];
          }
          continue;
        }

        // Look for variable declarations in global scope
        const varMatch = trimmed.match(/^(\w+)\s*=\s*(.+?);/);
        if (varMatch) {
          const [, name, valueStr] = varMatch;
          let type: "number" | "boolean" | "string";
          let value: any;

          // Skip if we're in a Hidden group (case insensitive)
          if (currentGroup.toLowerCase() === "hidden") {
            continue;
          }

          // Determine type and parse value
          if (valueStr === "true" || valueStr === "false") {
            type = "boolean";
            value = valueStr === "true";
          } else if (!isNaN(Number(valueStr))) {
            type = "number";
            value = Number(valueStr);
          } else {
            type = "string";
            value = valueStr.replace(/^["']|["']$/g, ""); // Remove quotes if present
          }

          params.push({
            name,
            type,
            group: currentGroup || undefined,
            value,
            default: valueStr,
          });
        }
      }

      return params;
    } catch (error) {
      this.logger.appendLine(`ERROR: Failed to parse SCAD file: ${error}`);
      throw error;
    }
  }
}
