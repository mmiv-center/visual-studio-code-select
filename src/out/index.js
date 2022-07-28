"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const preact_1 = require("preact");
const renderer_1 = require("./renderer");
require("./style.css");
const activate = (_context) => ({
    renderOutputItem(data, element) {
        try {
            (0, preact_1.render)((0, preact_1.h)(renderer_1.Response, { response: data.json() }), element);
        }
        catch {
            (0, preact_1.render)((0, preact_1.h)("p", null, "Error!"), element);
        }
    }
});
exports.activate = activate;
//# sourceMappingURL=index.js.map