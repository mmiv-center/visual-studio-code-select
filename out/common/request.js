import * as fs from 'fs';
import * as path from 'path';
var stringify = require('json-stringify-safe');
import { pickBy, identity, isEmpty } from 'lodash';
import { logDebug, formatURL } from './common';
import * as vscode from 'vscode';
import { Method } from './httpConstants';
import * as cache from './cache';
const { execSync } = require('child_process');
const process = require('process');
export class RequestParser {
    constructor(query, eol) {
        var _a, _b;
        this.valuesReplacedBySecrets = [];
        let linesOfText = query.split((eol == vscode.EndOfLine.LF ? '\n' : '\r\n'));
        if (linesOfText.filter(s => { return s; }).length === 0) {
            throw new Error('Please provide request information (at minimum a URL) before running the cell!');
        }
        logDebug(linesOfText);
        this.originalText = linesOfText;
        this.originalRequest = this._parseOutVariableDeclarations();
        if (this.originalRequest.length == 0) {
            return;
        }
        // we don't have variables defined, everything is stateless
        this.variableName = this._parseVariableName();
        // run the command in a data folder
        this.requestOptions = {
            data: "{ \"data\": [], \"matches\": 0, \"headers\": [] }",
            url: "",
            stderr: "nothing"
        };
        // the path of the file active in the editor
        var workSpaceDir = path.dirname((_b = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath) !== null && _b !== void 0 ? _b : '');
        workSpaceDir = path.normalize(workSpaceDir); // could be "." for the cwd
        // we need to know the location of ror as well as the location of the data folder
        var ror = execSync('which ror', { encoding: 'utf8' }).trim();
        process.chdir(workSpaceDir /* vscode.workspace.rootPath */);
        // check if this can be a ror folder (if .ror/config exists)
        if (!fs.existsSync('.ror/config')) {
            // we should produce an error - or make this a ror folder... 
            vscode.window.showInputBox({
                placeHolder: "Current directory for this select book",
                prompt: "Confirm that the location should be ror-ifyed",
                value: workSpaceDir
            }).then(function (folderLocation) {
                if (folderLocation != workSpaceDir) {
                    console.log("ror-ifying not possible in another folder...");
                    vscode.window.showErrorMessage("Move the select book file to the folder you want to use for ror");
                    return;
                }
                var cmd = ror + ' init -type notebook .';
                var txt = execSync(cmd, { encoding: 'utf8' }).trim();
                vscode.window.showInformationMessage(txt);
                // and continue, but what about the data?
            });
            return;
        }
        var cmd = ror + ' config --select \'' + linesOfText.join("\n") + '\'';
        this.requestOptions.data = execSync(cmd, { encoding: 'utf8' }).trim();
        // we should get the job list as json here as well, we would get ENOBUFS here for any real data as the buffer is not big enough (200kb?)
        var tmp_fname = '/tmp/tmpForRor.txt';
        var ops = { stdio: [0, 0, 0], encoding: 'utf8' };
        var log = require('fs').openSync(tmp_fname, 'w');
        ops.stdio = [0, log, 0];
        var child = require('child_process').spawnSync(ror, ["status", "--jobs"], ops);
        var rs = fs.readFileSync(tmp_fname, 'utf8');
        var j_tmp_str = !rs ? "" : rs.toString().trim();
        fs.unlink(tmp_fname, function () { });
        tmp_fname = '/tmp/tmpForRor2.txt';
        ops = { stdio: [0, 0, 0], encoding: 'utf8' };
        log = require('fs').openSync(tmp_fname, 'w');
        ops.stdio = [0, log, 0];
        child = require('child_process').spawnSync(ror, ["status", "--data"], ops);
        rs = fs.readFileSync(tmp_fname, 'utf8');
        var d_tmp_str = !rs ? "" : rs.toString().trim();
        fs.unlink(tmp_fname, function () { });
        /*
        try {
            var j_tmp_str = execSync(cmd, { encoding: 'utf8' }).trim();
        } catch (e) {
            console.log(e);
        } */
        var j_tmp = JSON.parse(j_tmp_str);
        var d_tmp = JSON.parse(d_tmp_str);
        this.requestOptions.headers = {
            jobs: j_tmp,
            input_data: d_tmp,
            workSpaceDir: workSpaceDir
        };
        this.requestOptions.ast = JSON.parse(this.requestOptions.data).ast;
        //var cmd = ror + ' status';
        //this.requestOptions.data += execSync(cmd, { encoding: 'utf8' }).trim();
        //this.requestOptions.headers = { bla: "header data", workSpaceDir: workSpaceDir };
        /*
        this.requestOptions = {
            method: this._parseMethod(),
            baseURL: this._parseBaseUrl(),
            timeout: 10000
        };

        this.requestOptions.params = this._parseQueryParams();

        let defaultHeaders = {};

        // eslint-disable-next-line @typescript-eslint/naming-convention
        if(process.env.NODE_ENV) {
            defaultHeaders = { "User-Agent": NAME };
        }
        this.requestOptions.headers = this._parseHeaders() ?? defaultHeaders;

        this.requestOptions.data = this._parseBody();
        */
    }
    getRequest() {
        if (this.requestOptions === undefined) {
            return undefined;
        }
        return pickBy(this.requestOptions, identity);
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    getVariableName() {
        return this.variableName;
    }
    wasReplacedBySecret(text) {
        if (typeof text === 'string') {
            for (let replaced of this.valuesReplacedBySecrets) {
                if (text.includes(replaced)) {
                    return true;
                }
            }
        }
        else if (typeof text === 'number') {
            for (let replaced of this.valuesReplacedBySecrets) {
                if (`${text}`.includes(replaced)) {
                    return true;
                }
            }
        }
        return false;
    }
    _parseOutVariableDeclarations() {
        const keyword = 'const ';
        let ret = [];
        let i = 0;
        while (i < this.originalText.length && this.originalText[i].trim().match(/const\s([A-Za-z0-9]+)(\s)?=/)) {
            let line = this.originalText[i];
            let startIndex = (line.indexOf(keyword) + keyword.length);
            let nameLength = line.indexOf('=') - startIndex;
            let varName = line.substr(startIndex, nameLength).trim();
            let varValueStr = line.substr(line.indexOf('=') + 1).trim();
            try {
                let varValue = JSON.parse(varValueStr);
                cache.addToCache(varName, varValue);
            }
            catch (e) {
                cache.addToCache(varName, varValueStr);
            }
            i++;
        }
        while (i < this.originalText.length && (!this.originalText[i] || this.originalText[i].length === 0)) {
            i++;
        }
        for (i; i < this.originalText.length; i++) {
            ret.push(this.originalText[i]);
        }
        return ret;
    }
    _parseVariableName() {
        let firstLine = this.originalRequest[0].trimLeft();
        if (!firstLine.startsWith('let ')) {
            return undefined;
        }
        let endIndexOfVarName = firstLine.indexOf('=') + 1;
        let varDeclaration = firstLine.substring(0, endIndexOfVarName);
        let variableName = varDeclaration.replace('let ', '');
        variableName = variableName.replace('=', '');
        variableName = variableName.trim();
        if (variableName.includes(' ')) {
            throw new Error('Invalid declaration of variable!');
        }
        if (variableName === 'SECRETS') {
            throw new Error('"SECRETS" variable name reserved for Secrets storage!');
        }
        return variableName;
    }
    _stripVariableDeclaration() {
        let firstLine = this.originalRequest[0].trimLeft();
        if (!firstLine.startsWith('let ')) {
            return firstLine;
        }
        let endIndexOfVarName = firstLine.indexOf('=') + 1;
        return firstLine.substring(endIndexOfVarName).trim();
    }
    _parseMethod() {
        const tokens = this._stripVariableDeclaration().split(/[\s,]+/);
        if (tokens.length === 0) {
            throw new Error('Invalid request!');
        }
        if (tokens.length === 1) {
            return Method.get;
        }
        if (!(tokens[0].toLowerCase() in Method)) {
            throw new Error('Invalid method given!');
        }
        return Method[tokens[0].toLowerCase()];
    }
    _parseBaseUrl() {
        const tokens = this._stripVariableDeclaration().split(/(?<=^\S+)\s/);
        if (tokens.length === 0) {
            throw new Error('Invalid request!');
        }
        const findAndReplaceVarsInUrl = (url) => {
            let tokens = url.split('/');
            for (let i = 0; i < tokens.length; i++) {
                if (!tokens[i].startsWith('$')) {
                    continue;
                }
                tokens[i] = this._attemptToLoadVariable(tokens[i]);
            }
            return tokens.join('/');
        };
        if (tokens.length === 1) {
            let url = findAndReplaceVarsInUrl(tokens[0].split('?')[0]);
            this.baseUrl = url;
            return formatURL(url);
        }
        else if (tokens.length === 2) {
            let url = findAndReplaceVarsInUrl(tokens[1].split('?')[0]);
            this.baseUrl = url;
            return formatURL(url);
        }
        throw new Error('Invalid URL given!');
    }
    _parseQueryParams() {
        let queryInUrl = this._stripVariableDeclaration().split('?')[1];
        let strParams = queryInUrl ? queryInUrl.split('&') : [];
        if (this.originalRequest.length >= 2) {
            let i = 1;
            while (i < this.originalRequest.length &&
                (this.originalRequest[i].trim().startsWith('?') ||
                    this.originalRequest[i].trim().startsWith('&'))) {
                strParams.push(this.originalRequest[i].trim().substring(1));
                i++;
            }
        }
        if (strParams.length === 0) {
            return undefined;
        }
        let params = {};
        for (const p of strParams) {
            let parts = p.split('=');
            if (parts.length !== 2) {
                throw new Error(`Invalid query parameter for ${p}`);
            }
            params[parts[0]] = this._attemptToLoadVariable(parts[1].trim());
            params[parts[0]] = params[parts[0]].replace(/%20/g, '+');
        }
        return params;
    }
    _parseHeaders() {
        if (this.originalRequest.length < 2) {
            return undefined;
        }
        let i = 1;
        while (i < this.originalRequest.length &&
            (this.originalRequest[i].trim().startsWith('?') ||
                this.originalRequest[i].trim().startsWith('&'))) {
            i++;
        }
        if (i >= this.originalRequest.length) {
            return undefined;
        }
        let headers = {};
        while (i < this.originalRequest.length && this.originalRequest[i]) {
            let h = this.originalRequest[i];
            let parts = h.split(/(:\s+)/).filter(s => { return !s.match(/(:\s+)/); });
            if (parts.length !== 2) {
                throw new Error(`Invalid header ${h}`);
            }
            if (parts[0] === 'User-Agent' && !process.env.NODE_ENV) {
                continue;
            }
            headers[parts[0]] = this._attemptToLoadVariable(parts[1].trim());
            i++;
        }
        return isEmpty(headers) ? undefined : headers;
    }
    _parseBody() {
        if (this.originalRequest.length < 3) {
            return undefined;
        }
        let i = 0;
        while (i < this.originalRequest.length && this.originalRequest[i]) {
            i++;
        }
        i++;
        let bodyStr = this.originalRequest.slice(i).join('\n');
        let fileContents = this._attemptToLoadFile(bodyStr);
        if (fileContents) {
            return fileContents;
        }
        if (bodyStr.startsWith('$')) {
            let variableContents = cache.attemptToLoadVariable(bodyStr.substr(1));
            if (variableContents) {
                if (bodyStr.startsWith('$SECRETS')) {
                    this.valuesReplacedBySecrets.push(variableContents);
                }
                return variableContents;
            }
        }
        try {
            let bodyObj = JSON.parse(bodyStr);
            // attemptToLoadVariableInObject(bodyObj); // TODO problems parsing body when given var name without quotes
            return bodyObj;
        }
        catch (e) {
            return bodyStr;
        }
    }
    _attemptToLoadFile(possibleFilePath) {
        var _a, _b;
        try {
            const workSpaceDir = path.dirname((_b = (_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath) !== null && _b !== void 0 ? _b : '');
            if (!workSpaceDir) {
                return;
            }
            const absolutePath = path.join(workSpaceDir, possibleFilePath);
            return fs.readFileSync(absolutePath).toString();
        }
        catch (error) {
            // File doesn't exist
        }
        return;
    }
    _attemptToLoadVariable(text) {
        let indexOfDollarSign = text.indexOf('$');
        if (indexOfDollarSign === -1) {
            return text;
        }
        let beforeVariable = text.substr(0, indexOfDollarSign);
        let indexOfEndOfPossibleVariable = this._getEndOfWordIndex(text, indexOfDollarSign);
        let possibleVariable = text.substr(indexOfDollarSign + 1, indexOfEndOfPossibleVariable);
        let loadedFromVariable = cache.attemptToLoadVariable(possibleVariable);
        if (loadedFromVariable) {
            if (typeof loadedFromVariable === 'string') {
                if (possibleVariable.startsWith('SECRETS')) {
                    this.valuesReplacedBySecrets.push(loadedFromVariable);
                }
                return beforeVariable + loadedFromVariable;
            }
            else {
                return beforeVariable + stringify(loadedFromVariable);
            }
        }
        return text;
    }
    _getEndOfWordIndex(text, startingIndex) {
        let indexOfSpace = text.indexOf(' ', startingIndex !== null && startingIndex !== void 0 ? startingIndex : 0);
        let indexOfComma = text.indexOf(',', startingIndex !== null && startingIndex !== void 0 ? startingIndex : 0);
        let indexOfSemicolon = text.indexOf(';', startingIndex !== null && startingIndex !== void 0 ? startingIndex : 0);
        let indexOfEnd = text.length - 1;
        let values = [];
        if (indexOfSpace !== -1) {
            values.push(indexOfSpace);
        }
        if (indexOfComma !== -1) {
            values.push(indexOfComma);
        }
        if (indexOfSemicolon !== -1) {
            values.push(indexOfSemicolon);
        }
        return Math.min(...values, indexOfEnd);
    }
}
//# sourceMappingURL=request.js.map