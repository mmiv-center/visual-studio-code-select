"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLanguageProvider = exports.VariableCompletionItemProvider = exports.CacheVariableCompletionItemProvider = exports.HeaderCompletionItemProvider = exports.KeywordCompletionItemProvider = void 0;
const vscode = require("vscode");
const common_1 = require("../common/common");
const cache_1 = require("../common/cache");
const httpConstants_1 = require("../common/httpConstants");
const selector = { language: common_1.NAME };
class KeywordCompletionItemProvider {
    provideCompletionItems(document, position, _token, _context) {
        const result = [];
        let autocompleteMethod = position.line === 0 ? true : false;
        for (const field of Object.values(httpConstants_1.Method)) {
            if (document.lineAt(position).text.includes(field)) {
                autocompleteMethod = false;
            }
        }
        if (autocompleteMethod) {
            for (const field of Object.values(httpConstants_1.Method)) {
                result.push({
                    label: field,
                    insertText: `${field} `,
                    detail: 'HTTP request method',
                    kind: vscode.CompletionItemKind.Method
                });
            }
        }
        if (position.line !== 0) {
            for (const field of Object.values(httpConstants_1.RequestHeaderField)) {
                result.push({
                    label: field,
                    insertText: `${field}: `,
                    detail: 'HTTP request header field',
                    kind: vscode.CompletionItemKind.Field
                });
            }
        }
        for (const url of (0, cache_1.getBaseUrls)()) {
            result.push({
                label: url,
                kind: vscode.CompletionItemKind.Keyword
            });
        }
        ["const", "let"].forEach(str => {
            result.push({
                label: str,
                insertText: `${str} `,
                kind: vscode.CompletionItemKind.Keyword
            });
        });
        return result;
    }
}
exports.KeywordCompletionItemProvider = KeywordCompletionItemProvider;
KeywordCompletionItemProvider.triggerCharacters = [];
class HeaderCompletionItemProvider {
    provideCompletionItems(_document, position, _token, _context) {
        const result = [];
        if (position.line === 0) {
            return result;
        }
        for (const field of Object.values(httpConstants_1.MIMEType)) {
            result.push({
                label: field,
                detail: 'HTTP MIME type',
                kind: vscode.CompletionItemKind.EnumMember
            });
        }
        return result;
    }
}
exports.HeaderCompletionItemProvider = HeaderCompletionItemProvider;
HeaderCompletionItemProvider.triggerCharacters = [':'];
class CacheVariableCompletionItemProvider {
    provideCompletionItems(_document, _position, _token, _context) {
        const result = [];
        for (const variable of (0, cache_1.getVariableNames)()) {
            result.push({
                label: variable,
                kind: vscode.CompletionItemKind.Variable
            });
        }
        return result;
    }
}
exports.CacheVariableCompletionItemProvider = CacheVariableCompletionItemProvider;
CacheVariableCompletionItemProvider.triggerCharacters = ['$'];
class VariableCompletionItemProvider {
    provideCompletionItems(document, position, _token, _context) {
        const result = [];
        let text = document.lineAt(position.line).text.substring(0, position.character);
        let startingIndex = Math.max(text.lastIndexOf(' '), text.lastIndexOf('='), text.lastIndexOf('/')) + 1;
        let varName = text.substring(startingIndex).trim();
        if (!varName.startsWith('$')) {
            return result;
        }
        varName = varName.substr(1, varName.length - 2);
        let matchingData = (0, cache_1.attemptToLoadVariable)(varName);
        if (matchingData && typeof matchingData === 'object') {
            for (let key of Object.keys(matchingData)) {
                result.push({
                    label: key,
                    kind: vscode.CompletionItemKind.Variable
                });
            }
        }
        return result;
    }
}
exports.VariableCompletionItemProvider = VariableCompletionItemProvider;
VariableCompletionItemProvider.triggerCharacters = ['.'];
function registerLanguageProvider() {
    const disposables = [];
    // TODO add hover provider or definition provider
    disposables.push(vscode.languages.registerCompletionItemProvider(selector, new KeywordCompletionItemProvider(), ...KeywordCompletionItemProvider.triggerCharacters));
    disposables.push(vscode.languages.registerCompletionItemProvider(selector, new HeaderCompletionItemProvider(), ...HeaderCompletionItemProvider.triggerCharacters));
    disposables.push(vscode.languages.registerCompletionItemProvider(selector, new CacheVariableCompletionItemProvider(), ...CacheVariableCompletionItemProvider.triggerCharacters));
    disposables.push(vscode.languages.registerCompletionItemProvider(selector, new VariableCompletionItemProvider(), ...VariableCompletionItemProvider.triggerCharacters));
    return vscode.Disposable.from(...disposables);
}
exports.registerLanguageProvider = registerLanguageProvider;
//# sourceMappingURL=languageProvider.js.map