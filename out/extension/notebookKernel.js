"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookKernel = void 0;
const common_1 = require("../common/common");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const request_1 = require("../common/request");
const response_1 = require("../common/response");
const cache_1 = require("../common/cache");
const axios = require('axios').default;
var stringify = require('json-stringify-safe');
class NotebookKernel {
    constructor(isInteractive) {
        this.id = 'select-book-kernel';
        this.notebookType = 'select-book';
        this.label = 'Select Book';
        this.supportedLanguages = ['select-book'];
        this._executionOrder = 0;
        if (isInteractive) {
            this.id = 'select-book-interactive-kernel';
            this.notebookType = 'interactive';
        }
        this._controller = vscode.notebooks.createNotebookController(this.id, this.notebookType, this.label);
        this._controller.supportedLanguages = ['select-book'];
        this._controller.supportsExecutionOrder = true;
        this._controller.description = 'A notebook for select operations.';
        this._controller.executeHandler = this._executeAll.bind(this);
    }
    dispose() {
        this._controller.dispose();
    }
    _executeAll(cells, _notebook, _controller) {
        for (let cell of cells) {
            this._doExecution(cell);
        }
    }
    async _doExecution(cell) {
        const execution = this._controller.createNotebookCellExecution(cell);
        execution.executionOrder = ++this._executionOrder;
        execution.start(Date.now());
        const logger = (d, r, requestParser) => {
            try {
                const response = new response_1.ResponseParser(d, r, requestParser);
                (0, cache_1.updateCache)(requestParser, response);
                execution.replaceOutput([new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.json(response.renderer(), common_1.MIME_TYPE),
                        vscode.NotebookCellOutputItem.json(response.json(), 'text/x-json'),
                        vscode.NotebookCellOutputItem.text(response.html(), 'text/html')
                    ])]);
                execution.end(true, Date.now());
            }
            catch (e) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error({
                            name: e instanceof Error && e.name || 'error',
                            message: e instanceof Error && e.message || stringify(e, undefined, 4)
                        })
                    ])
                ]);
                execution.end(false, Date.now());
            }
        };
        let req;
        let parser;
        try {
            parser = new request_1.RequestParser(cell.document.getText(), cell.document.eol);
            req = parser.getRequest();
            if (req === undefined) {
                execution.end(true, Date.now());
                return;
            }
        }
        catch (err) {
            execution.replaceOutput([
                new vscode.NotebookCellOutput([
                    vscode.NotebookCellOutputItem.error({
                        name: err instanceof Error && err.name || 'error',
                        message: err instanceof Error && err.message || stringify(err, undefined, 4)
                    })
                ])
            ]);
            execution.end(false, Date.now());
            return;
        }
        try {
            const cancelTokenAxios = axios.CancelToken.source();
            let options = { ...req };
            options['cancelToken'] = cancelTokenAxios.token;
            execution.token.onCancellationRequested(_ => cancelTokenAxios.cancel());
            let response = await axios(options);
            logger(response, req, parser);
        }
        catch (exception) {
            logger(exception, req, parser);
        }
    }
    async _saveDataToFile(data) {
        var _a, _b, _c;
        const workSpaceDir = path.dirname((_b = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath) !== null && _b !== void 0 ? _b : '');
        if (!workSpaceDir) {
            return;
        }
        let name;
        const url = (_c = data.request) === null || _c === void 0 ? void 0 : _c.responseUrl;
        if (url) {
            name = url;
            name = name.replace(/^[A-Za-z0-9]+\./g, '');
            name = name.replace(/\.[A-Za-z0-9]+$/g, '');
            name = name.replace(/\.\:\//g, '-');
        }
        else {
            name = 'unknown-url';
        }
        let date = new Date().toDateString().replace(/\s/g, '-');
        const defaultPath = vscode.Uri.file(path.join(workSpaceDir, `response-${name}-${date}.json`));
        const location = await vscode.window.showSaveDialog({ defaultUri: defaultPath });
        if (!location) {
            return;
        }
        fs.writeFile(location === null || location === void 0 ? void 0 : location.fsPath, stringify(data, null, 4), { flag: 'w' }, (e) => {
            vscode.window.showInformationMessage((e === null || e === void 0 ? void 0 : e.message) || `Saved response to ${location}`);
        });
    }
    ;
}
exports.NotebookKernel = NotebookKernel;
//# sourceMappingURL=notebookKernel.js.map