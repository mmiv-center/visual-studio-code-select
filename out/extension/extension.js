"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const notebookKernel_1 = require("./notebookKernel");
const notebookSerializer_1 = require("./notebookSerializer");
const languageProvider_1 = require("./languageProvider");
const commands_1 = require("./commands");
const secrets_1 = require("../common/secrets");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('select-book is now active!');
    // Regular kernel
    context.subscriptions.push(new notebookKernel_1.NotebookKernel());
    // Kernel for interactive window
    context.subscriptions.push(new notebookKernel_1.NotebookKernel(true));
    context.subscriptions.push(vscode.workspace.registerNotebookSerializer('select-book', new notebookSerializer_1.NotebookSerializer(), {
        transientOutputs: false,
        transientCellMetadata: {
            inputCollapsed: true,
            outputCollapsed: true,
        }
    }));
    context.subscriptions.push((0, languageProvider_1.registerLanguageProvider)());
    context.subscriptions.push((0, commands_1.registerCommands)(context.extension.id));
    (0, secrets_1.initializeSecretsRegistry)(context);
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map