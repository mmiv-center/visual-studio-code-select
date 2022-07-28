"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookSerializer = void 0;
const vscode = require("vscode");
const stringify = require('json-stringify-safe');
class NotebookSerializer {
    async deserializeNotebook(content, _token) {
        var contents = new TextDecoder().decode(content); // convert to String to make JSON object
        // Read file contents
        let raw;
        try {
            raw = JSON.parse(contents);
        }
        catch {
            raw = [];
        }
        function convertRawOutputToBytes(raw) {
            let result = [];
            for (let output of raw.outputs) {
                let data = new TextEncoder().encode(stringify(output.value));
                result.push(new vscode.NotebookCellOutputItem(data, output.mime));
            }
            return result;
        }
        // Create array of Notebook cells for the VS Code API from file contents
        const cells = raw.map(item => new vscode.NotebookCellData(item.kind, item.value, item.language));
        for (let i = 0; i < cells.length; i++) {
            let cell = cells[i];
            cell.outputs = raw[i].outputs ? [new vscode.NotebookCellOutput(convertRawOutputToBytes(raw[i]))] : [];
        }
        // Pass read and formatted Notebook Data to VS Code to display Notebook with saved cells
        return new vscode.NotebookData(cells);
    }
    async serializeNotebook(data, _token) {
        // function to take output renderer data to a format to save to the file
        function asRawOutput(cell) {
            var _a;
            let result = [];
            for (let output of (_a = cell.outputs) !== null && _a !== void 0 ? _a : []) {
                for (let item of output.items) {
                    let outputContents = '';
                    try {
                        outputContents = new TextDecoder().decode(item.data);
                    }
                    catch {
                    }
                    try {
                        let outputData = JSON.parse(outputContents);
                        result.push({ mime: item.mime, value: outputData });
                    }
                    catch {
                        result.push({ mime: item.mime, value: outputContents });
                    }
                }
            }
            return result;
        }
        // Map the Notebook data into the format we want to save the Notebook data as
        let contents = [];
        for (const cell of data.cells) {
            contents.push({
                kind: cell.kind,
                language: cell.languageId,
                value: cell.value,
                outputs: asRawOutput(cell)
            });
        }
        // Give a string of all the data to save and VS Code will handle the rest 
        return new TextEncoder().encode(stringify(contents));
    }
}
exports.NotebookSerializer = NotebookSerializer;
//# sourceMappingURL=notebookSerializer.js.map