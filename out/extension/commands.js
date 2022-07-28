"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = void 0;
const vscode = require("vscode");
const secrets = require("../common/secrets");
class SecretItem {
    constructor(label) {
        this.label = label;
    }
}
class AddNewSecretItem {
    constructor() {
        this.label = '$(plus) Add New Secret...';
        this.alwaysShow = true;
    }
}
class ViewSecretItem {
    constructor(secret) {
        this.alwaysShow = true;
        this.secretName = secret;
    }
    get label() {
        return `View the secret for ${this.secretName}...`;
    }
}
class DeleteSecretItem {
    constructor(secret) {
        this.alwaysShow = true;
        this.secretName = secret;
    }
    get label() {
        return `Delete ${this.secretName}...`;
    }
}
class SetSecretName {
    constructor(placeholder) {
        this.secretName = '';
        this.alwaysShow = true;
        if (placeholder) {
            this.secretName = placeholder;
        }
    }
    get label() {
        return this.secretName;
    }
}
class SetSecretValueItem {
    constructor(placeholder) {
        this.secret = '';
        this.alwaysShow = true;
        if (placeholder) {
            this.secret = placeholder;
        }
    }
    get label() {
        return this.secret;
    }
}
var InteractiveSecretPickerState;
(function (InteractiveSecretPickerState) {
    InteractiveSecretPickerState[InteractiveSecretPickerState["selectAction"] = 0] = "selectAction";
    InteractiveSecretPickerState[InteractiveSecretPickerState["editSecret"] = 1] = "editSecret";
})(InteractiveSecretPickerState || (InteractiveSecretPickerState = {}));
var InteractiveSecretInputState;
(function (InteractiveSecretInputState) {
    InteractiveSecretInputState[InteractiveSecretInputState["addSecretName"] = 0] = "addSecretName";
    InteractiveSecretInputState[InteractiveSecretInputState["addSecretValue"] = 1] = "addSecretValue";
})(InteractiveSecretInputState || (InteractiveSecretInputState = {}));
function _getSecretInput(state, autofills) {
    const quickInput = vscode.window.createInputBox();
    quickInput.value = autofills.label;
    switch (+state) {
        case InteractiveSecretInputState.addSecretName:
            if (autofills.label === '') {
                quickInput.title = "Create a name for your secret";
            }
            else {
                quickInput.title = "Edit name of secret";
            }
            break;
        case InteractiveSecretInputState.addSecretValue:
            if (autofills.label === '') {
                quickInput.title = "Add secret";
            }
            else {
                quickInput.title = "Edit secret";
            }
            break;
    }
    return quickInput;
}
async function _showSecretInput(state, autofills) {
    return new Promise((resolve, _) => {
        const quickInput = _getSecretInput(state, autofills);
        let closeQuickInput = () => {
            quickInput.hide();
            quickInput.dispose();
        };
        quickInput.onDidAccept(() => {
            if (autofills instanceof SetSecretName) {
                resolve({ value: quickInput.value, id: 'name' });
            }
            else if (autofills instanceof SetSecretValueItem) {
                closeQuickInput();
                resolve({ value: quickInput.value, id: 'value' });
            }
        });
        quickInput.show();
    });
}
function _getSecretPicker(state, extra) {
    const quickPick = vscode.window.createQuickPick();
    quickPick.ignoreFocusOut = true;
    let newQpItems = [];
    switch (+state) {
        case InteractiveSecretPickerState.selectAction:
            const secretListItems = extra.map(b => new SecretItem(b));
            quickPick.title = 'View an existing secret or add a new secret';
            newQpItems = [...secretListItems];
            newQpItems.splice(0, 0, new AddNewSecretItem());
            break;
        case InteractiveSecretPickerState.editSecret:
            if (typeof extra === 'string') {
                quickPick.title = `View or delete ${extra}`;
                newQpItems.push(new ViewSecretItem(extra));
                newQpItems.push(new DeleteSecretItem(extra));
                break;
            }
    }
    quickPick.items = newQpItems;
    return quickPick;
}
async function _showSecretPicker(state, extra) {
    return new Promise((resolve, _reject) => {
        const quickPick = _getSecretPicker(state, extra);
        let secret;
        let closeQuickPick = () => {
            quickPick.busy = false;
            quickPick.hide();
            quickPick.dispose();
        };
        quickPick.onDidAccept(async () => {
            quickPick.busy = true;
            const selected = quickPick.selectedItems[0];
            if (selected instanceof AddNewSecretItem) {
                resolve({ type: 'command', id: 'new' });
                return;
            }
            if (selected instanceof ViewSecretItem) {
                resolve({ type: 'command', id: 'view', value: extra });
                return;
            }
            if (selected instanceof DeleteSecretItem) {
                resolve({ type: 'command', id: 'delete', value: extra });
                closeQuickPick();
                return;
            }
            secret = selected.label;
            closeQuickPick();
        });
        quickPick.onDidHide(async () => {
            if (secret) {
                resolve({ type: 'secret', id: 'secret', value: secret });
            }
            else {
                resolve(null);
            }
        });
        quickPick.show();
    });
}
async function _useInteractiveSecretInput(state, secret) {
    let placeholder;
    if (secret) {
        placeholder = secrets.getSecret(secret);
    }
    let inputResult;
    switch (+state) {
        case InteractiveSecretInputState.addSecretName:
            inputResult = await _showSecretInput(state, new SetSecretName(placeholder));
            break;
        case InteractiveSecretInputState.addSecretValue:
            inputResult = await _showSecretInput(state, new SetSecretValueItem(placeholder));
            break;
    }
    if ((inputResult === null || inputResult === void 0 ? void 0 : inputResult.id) === 'name') {
        _useInteractiveSecretInput(InteractiveSecretInputState.addSecretValue, inputResult.value);
    }
    else if ((inputResult === null || inputResult === void 0 ? void 0 : inputResult.id) === 'value' && secret) {
        secrets.addSecret(secret, inputResult.value);
        vscode.window.showInformationMessage(`Saved secret for ${secret}.`);
    }
}
async function _useInteractiveSecretPicker(state, extra) {
    const pickerResult = await _showSecretPicker(state, extra);
    if (!pickerResult) {
        return;
    }
    if (pickerResult.type === 'secret') {
        _useInteractiveSecretPicker(InteractiveSecretPickerState.editSecret, pickerResult.value);
        return;
    }
    if (pickerResult.type === 'command' && pickerResult.id === 'new') {
        _useInteractiveSecretInput(InteractiveSecretInputState.addSecretName);
        return;
    }
    if (pickerResult.type === 'command' && pickerResult.id === 'view') {
        if (pickerResult.value) {
            _useInteractiveSecretInput(InteractiveSecretInputState.addSecretValue, pickerResult.value);
        }
        else {
            _useInteractiveSecretInput(InteractiveSecretInputState.addSecretValue);
        }
        return;
    }
    if (pickerResult.type === 'command' && pickerResult.id === 'delete') {
        if (pickerResult.value) {
            secrets.deleteSecret(pickerResult.value);
        }
        vscode.window.showInformationMessage(`Deleted secret ${pickerResult.value}.`);
        return;
    }
}
function registerCommands(extensionId) {
    const subscriptions = [];
    subscriptions.push(vscode.commands.registerCommand('select-book.secrets', () => {
        _useInteractiveSecretPicker(InteractiveSecretPickerState.selectAction, secrets.getNamesOfSecrets());
    }));
    subscriptions.push(vscode.commands.registerCommand('select-book.newNotebook', async () => {
        const newNotebook = await vscode.workspace.openNotebookDocument('select-book', new vscode.NotebookData([
            new vscode.NotebookCellData(vscode.NotebookCellKind.Code, '', 'select-book')
        ]));
        vscode.window.showNotebookDocument(newNotebook);
    }));
    subscriptions.push(vscode.commands.registerCommand('select-book.newInteractive', async () => {
        const result = await vscode.commands.executeCommand('interactive.open', undefined, undefined, `${extensionId}/select-book-interactive-kernel`, undefined);
    }));
    return vscode.Disposable.from(...subscriptions);
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=commands.js.map