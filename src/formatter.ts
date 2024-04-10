"use strict";
import * as vscode from "vscode";

export class STFormatterProvider implements vscode.DocumentFormattingEditProvider {
    private functions: Array<string> = [];
    private keywords: Array<string> = [];
    private types: Array<string> = [];
    private ends: Array<string> = [];
    private skipString: Array<string> = [];

    provideDocumentFormattingEdits(document: vscode.TextDocument) {
        if (vscode.window.visibleTextEditors.every((e) => e.document.fileName !== document.fileName)) {
            return [];
        }

        let out = [];
        this.functions = [
            "abs",
            "sin",
            "mod",
            "abs",
            "acos",
            "asin",
            "atan",
            "cos",
            "exp",
            "expt",
            "ln",
            "log",
            "sin",
            "sqrt",
            "tan",
            "sel",
            "mux",
            "shl",
            "shr",
            "rol",
            "ror",
            "add",
            "div",
            "mul",
            "sub",
            "limit",
            "max",
            "min",
            "adr",
            "adrinst",
            "size",
            "sizeof",
            "bit_adr",
            "bit_trunc",
            "rs",
            "sr",
            "ton",
            "tp",
            "tof",
            "trunc",
            "ctd",
            "ctu",
            "ctud",
            "r_trig",
            "f_trig",
            "move",
            "concat",
            "delete",
            "find",
            "insert",
            "left",
            "len",
            "replace",
            "right",
            "rtc",
            "mid",
            "sema",
            "round",
            "floor",
            "ceil",
            "unpack",
            "ref",
            "__new",
            "__delete",

            "[A-Za-z_]*(_TO_)[A-Za-z_]*",
            "(?:TO_|FROM_|TRUNC_)[A-Za-z_]*",
        ];

        this.keywords = [
            "true",
            "false",
            "exit",
            "continue",
            "return",
            "constant",
            "retain",
            "public",
            "private",
            "protected",
            "abstract",
            "persistent",
            "internal",
            "final",
            "of",
            "else",
            "elsif",
            "then",
            "__try",
            "__catch",
            "__finally",
            "__endtry",
            "do",
            "to",
            "by",
            "task",
            "with",
            "using",
            "uses",
            "from",
            "until",
            "or",
            "or_else",
            "and",
            "and_then",
            "not",
            "xor",
            "nor",
            "ge",
            "le",
            "eq",
            "ne",
            "gt",
            "lt",
            "extends",
            "implements",
            "this",
            "super",
            "(?:T|DT|TOD|D)#(?=[0-9])",
            // '(?:T|DT|TOD|D)#[0-9\\:\\-\\_yYmMdDhHsS]+',
            "var_(?:input|output|in_out|temp|global|access|external)",
        ];

        this.types = [
            "AT",
            "BOOL",
            "BYTE",
            "(?:D|L)?WORD",
            "U?(?:S|D|L)?INT",
            "L?REAL",
            "TIME(?:_OF_DAY)?",
            "TOD",
            "TON",
            "DT",
            "DATE(?:_AND_TIME)?",
            "W?STRING",
            "ARRAY",
            "ANY",
            "ANY_(?:NUM|INT|REAL)",
        ];

        this.ends = [
            "var",
            "program",
            "if",
            "case",
            "while",
            "for",
            "repeat",
            "function",
            "function_block",
            "struct",
            "configuration",
            "tcp",
            "resource",
            "channel",
            "library",
            "folder",
            "binaries",
            "includes",
            "sources",
            "action",
            "step",
            "initial_step",
            "transition",
            "type",
            "namespace",
            "implementation",
            "interface",
            "property",
            "get",
            "set",
            "method",
            "union",
            "class",
        ];

        // Do not format this strings
        this.skipString = [
            `["']{1}[^\"\'\\\\]*(?:\\\\[\\s\\S][^"'\\\\]*)*["']{1}`, // All strings in quotes
            "\\(\\*[\\s\\S]*?\\*\\)", // All comments in braces
            "\\/\\*[\\s\\S]*?\\*\\/", // All comments in slashes
            "\\/\\/[^\\n]*\\n", // All single line comments
        ];

        let text = document.getText();

        text = this.capitalize(text);

        text = this.spaces(text);

        let regEndFunctions = new RegExp(`\\bEND_IF;|\\bEND_CASE;|\\bEND_WHILE;|\\bEND_VAR`, "g");
        text = this.addLineEndingAfterRegex(text, regEndFunctions);

        text = this.removeTabsAndSpacesFromEmptyLines(text);
        text = this.reduceLineBreaks(text);

        text = this.tabulate(text);

        text = this.removeLineBreaksBetweenIfAndThen(text);
        text = this.removeLineBreaksBetweenElsifAndThen(text);

        out.push(
            new vscode.TextEdit(
                new vscode.Range(
                    new vscode.Position(0, 0),
                    document.lineAt(document.lineCount - 1).range.end
                ),
                text
            )
        );

        return out;
    }

    removeTabsAndSpacesFromEmptyLines(text: string): string {
        // Split the text into lines
        const lines = text.split("\n");

        // Iterate through each line
        const processedLines = lines.map((line) => {
            // If the line is empty or contains only tabs/spaces, remove them
            if (line.trim() === "") {
                return "";
            } else {
                // Otherwise, return the line as is
                return line;
            }
        });

        // Join the processed lines back together with newline characters
        const result = processedLines.join("\n");

        return result;
    }

    addLineEndingAfterRegex(text: string, regex: RegExp): string {
        // Replace the matches of the regex with the match followed by a line ending
        const result = text.replace(regex, (match) => match + "\n");

        return result;
    }

    removeLineBreaksBetweenIfAndThen(expression: string): string {
        const regex = /\bIF\b\s+(.*?)\s+\bTHEN\b/gs;
        const result = expression.replace(regex, (match) => match.split(/\s+/).join(" ").trim());
        return result;
    }
    removeLineBreaksBetweenElsifAndThen(expression: string): string {
        const regex = /\bELSIF\b\s+(.*?)\s+\bTHEN\b/gs;
        const result = expression.replace(regex, (match) => match.split(/\s+/).join(" ").trim());
        return result;
    }

    reduceLineBreaks(text: string): string {
        // Use regular expression to find instances of more than three consecutive line breaks
        const regex = /(\n{3,})/g;

        // Replace instances of more than three consecutive line breaks with two line breaks
        const result = text.replace(regex, "\n\n\n");

        return result;
    }

    spaces(text: string): string {
        // Delete all double spaces
        const regex = /(?<!^| )  /gm;
        const regex2 = /\t/g;

        while (text.match(regex) !== null) {
            text = text.replace(regex, " ");
        }

        while (text.match(regex2) !== null) {
            text = text.replace(regex2, " ");
        }

        while (text.match(regex) !== null) {
            text = text.replace(regex, " ");
        }

        // Delete space between func name and (
        // ABS ( to ABS(
        let regEx = new RegExp(`\\b(?:${this.functions.join("|")})\\b\\s+\\(`, "ig");
        text = text.replace(regEx, (match) => {
            return match.replace(/\s+/, "");
        });

        // Add space after keywords
        // IF( to IF (
        regEx = new RegExp(`\\b(IF|WHILE|CASE)\\(`, "ig");
        text = text.replace(regEx, (match, key) => {
            return key !== undefined ? key + " (" : match;
        });

        // Add before after keywords
        // )THEN to ) THEN
        regEx = new RegExp(`\\)(THEN|DO|OF)\\b`, "ig");
        text = text.replace(regEx, (match, key) => {
            return key !== undefined ? ") " + key : match;
        });

        let addSpace = {
            csb: ["\\*\\)", "\\*\\/", "(?<=.)\\/\\/", "(?<=.)\\(\\*", "(?<=.)\\/\\*"],
            csa: ["\\(\\*", "\\/\\*", "\\/\\/"],
            ss: [":=", "<>", ">=", "<=", "=>", "\\+", "\\-", "\\/"],
            sb: ["(?<!<|>|:)=", ":", "(?<!\\*)\\*(?!\\*)", "<", "(?<!=|<)>"],
            sa: ["=(?!>| )", ":(?!=)", "\\*(?!\\*|;)", ",", "<(?!=|>)", ">(?!=)"],
        };

        regEx = new RegExp(`(?<! |\\t)(${addSpace.csb.join("|")})`, "ig");
        text = text.replace(regEx, (match, sign) => " " + sign);
        regEx = new RegExp(`(${addSpace.csa.join("|")})(?! |\\t)`, "ig");
        text = text.replace(regEx, (match, sign) => sign + " ");

        regEx = new RegExp(
            `${this.skipString.join("|")}|(?<! |\\t)(${addSpace.ss.join("|")}|${addSpace.sb.join("|")})`,
            "ig"
        );
        text = text.replace(regEx, (match, sign) => (sign !== undefined ? " " + sign : match));
        regEx = new RegExp(
            `${this.skipString.join("|")}|(${addSpace.ss.join("|")}|${addSpace.sa.join("|")})(?! |\\t)`,
            "ig"
        );
        text = text.replace(regEx, (match, sign) => (sign !== undefined ? sign + " " : match));

        // Delete all spaces at the end of the lines
        text = text
            .split("\n")
            .map((el) => el.trimEnd())
            .join("\n");

        // regEx = new RegExp(`[\s]+:(?!=)`, "ig");
        text = text.replace(/[\s]+:(?!=)/g, ":");
        // regEx = new RegExp(`;[\s]+\n$`, "ig");
        text = text.replace(/;[\s]+\n$/g, ";\n");

        return text;
    }

    tabulate(text: string): string {
        // NOTES:
        // - Comments at the end of IF does not work
        // - Comments need more work
        var lines = text.split(/\r\n|\r|\n/);
        var tab = 0;

        let regEx11 = new RegExp("\\bIF\\b|\\bCASE\\b|\\bWHILE\\b|\\bVAR\\b", "g");
        let regEx12 = new RegExp("\\bELSIF|\\bELSE", "g");
        let regEx13 = new RegExp(`\\bEND_IF;|\\bEND_CASE;|\\bEND_WHILE;|\\bEND_VAR`, "g");

        let regEx20 = new RegExp("\\b\\d+:(?:\\s*\\(\\*.*?\\*\\))?", "g");

        const dynamicPattern = "^\\(\\*|^\\/\\/";
        let regEx14 = new RegExp(dynamicPattern, "g");

        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].trim();
            lines[i] = lines[i].trim();

            if (!regEx14.test(lines[i])) {
                if (regEx11.test(lines[i])) {
                    lines[i] = "\t".repeat(tab) + lines[i];
                    tab = tab + 1;
                } else if (regEx12.test(lines[i]) || regEx20.test(lines[i])) {
                    lines[i] = "\t".repeat(tab - 1) + lines[i];
                } else if (regEx13.test(lines[i])) {
                    if (tab > 0) {
                        tab = tab - 1;
                    }
                    lines[i] = "\t".repeat(tab) + lines[i];
                } else {
                    lines[i] = "\t".repeat(tab) + lines[i];
                }
            } else {
                lines[i] = "\t".repeat(tab) + lines[i];
            }
        }

        text = lines.join("\n");

        return text;
    }

    capitalize(text: string): string {
        let regEx = new RegExp(
            `(?<!\\\\(?:\\\\{2})*)${this.skipString.join("|")}|\\b(${this.types.join(
                "|"
            )}|${this.keywords.join("|")}|(?:END_)?(?:${this.ends.join("|")})|${this.functions.join(
                "\\(|"
            )}\\()\\b`,
            "ig"
        );
        text = text.replace(regEx, (match, group) => {
            return group !== undefined ? match.toUpperCase() : match;
        });

        text = text.replace(/(?<=T|DT|TOD|D)#[0-9\\:\\-\\_yYmMdDhHsS]+/gi, (match, group) => {
            return group !== undefined ? match.toLowerCase() : match;
        });

        return text;
    }
}
