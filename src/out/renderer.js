"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const preact_1 = require("preact");
const hooks_1 = require("preact/hooks");
const uuid_1 = require("uuid");
var stringify = require('json-stringify-safe');
const Search = require("vscode-codicons/src/icons/search.svg");
const Response = ({ response }) => {
    var _a, _b;
    const [activeIndex, setActive] = (0, hooks_1.useState)(0);
    const [searchKeyword, setSearchKeyword] = (0, hooks_1.useState)('');
    const uuid = (0, uuid_1.v4)();
    const searchBarId = `search-bar-${uuid}`;
    const searchButtonId = `search-button-${uuid}`;
    let darkMode = (_b = (_a = document.body.getAttribute('data-vscode-theme-kind')) === null || _a === void 0 ? void 0 : _a.includes('dark')) !== null && _b !== void 0 ? _b : false;
    (0, hooks_1.useEffect)(() => {
        var _a;
        (_a = document.getElementById(searchBarId)) === null || _a === void 0 ? void 0 : _a.addEventListener('keypress', event => {
            var _a;
            if (event.key === 'Enter') {
                (_a = document.getElementById(searchButtonId)) === null || _a === void 0 ? void 0 : _a.click();
            }
        });
    });
    return (0, preact_1.h)("div", null,
        (0, preact_1.h)(Status, { code: response.status, text: response.statusText, request: response.request }),
        (0, preact_1.h)("br", null),
        (0, preact_1.h)("div", { class: 'tab-bar' },
            (0, preact_1.h)(TabHeader, { activeTab: activeIndex, setActive: setActive, headersExist: response.headers, configExists: response.config, requestExists: response.request, darkMode: darkMode }),
            (0, preact_1.h)("span", { class: 'tab-bar-tools' },
                (0, preact_1.h)("input", { id: searchBarId, placeholder: 'Search for keyword' }),
                (0, preact_1.h)("button", { id: searchButtonId, class: 'search-button', title: 'Search for keyword', onClick: () => handleSearchForKeywordClick(setSearchKeyword, searchBarId) },
                    (0, preact_1.h)(Icon, { name: Search })))),
        (0, preact_1.h)("br", null),
        (0, preact_1.h)(DataTab, { data: response.data, active: activeIndex === 0, searchKeyword: searchKeyword }),
        (0, preact_1.h)(TableTab, { dict: response.headers, active: activeIndex === 1, searchKeyword: searchKeyword }),
        (0, preact_1.h)(TableTab, { dict: response.config, active: activeIndex === 2, searchKeyword: searchKeyword }),
        (0, preact_1.h)(TableTab, { dict: response.request, active: activeIndex === 3, searchKeyword: searchKeyword }));
};
exports.Response = Response;
const TabHeader = ({ activeTab, setActive, headersExist, configExists, requestExists, darkMode }) => {
    const renderTabHeaders = () => {
        let result = [];
        //@ts-ignore
        result.push((0, preact_1.h)("button", { class: 'tab', "dark-mode": darkMode, onClick: () => setActive(0), active: activeTab === 0 }, "Data"));
        if (headersExist) {
            //@ts-ignore
            result.push((0, preact_1.h)("button", { class: 'tab', "dark-mode": darkMode, onClick: () => setActive(1), active: activeTab === 1 }, "Headers"));
        }
        if (configExists) {
            //@ts-ignore
            result.push((0, preact_1.h)("button", { class: 'tab', "dark-mode": darkMode, onClick: () => setActive(2), active: activeTab === 2 }, "Config"));
        }
        if (requestExists) {
            //@ts-ignore
            result.push((0, preact_1.h)("button", { class: 'tab', "dark-mode": darkMode, onClick: () => setActive(3), active: activeTab === 3 }, "Request Sent"));
        }
        return result;
    };
    return (0, preact_1.h)("span", null, renderTabHeaders());
};
// reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
const Status = ({ code, text, request }) => {
    let statusType;
    if (code < 200) {
        statusType = 'info';
    }
    else if (code < 300) {
        statusType = 'success';
    }
    else if (code < 400) {
        statusType = 'redirect';
    }
    else if (code < 500) {
        statusType = 'client-err';
    }
    else if (code < 600) {
        statusType = 'server-err';
    }
    const generateCodeLabel = () => {
        //@ts-ignore
        return (0, preact_1.h)("span", { class: 'status-label', statusType: statusType },
            request.method,
            " ",
            code,
            " ",
            text);
    };
    return (0, preact_1.h)("div", null,
        generateCodeLabel(),
        "   ",
        (0, preact_1.h)("span", { class: 'request-url' },
            "   ",
            request.responseUrl));
};
const TableTab = ({ dict, active, searchKeyword }) => {
    const renderFields = () => {
        return Object.keys(dict).map((key) => {
            if (typeof dict[key] === 'object') {
                return (0, preact_1.h)("tr", null,
                    (0, preact_1.h)("td", { class: 'key column' }, key),
                    (0, preact_1.h)("td", null,
                        (0, preact_1.h)("ul", { class: 'sub-list' }, Object.keys(dict[key]).map((subKey) => {
                            let value;
                            if (typeof dict[key][subKey] === 'object') {
                                value = stringify(dict[key][subKey]);
                            }
                            else {
                                value = dict[key][subKey];
                            }
                            return (0, preact_1.h)("li", null,
                                (0, preact_1.h)("span", { class: 'key' },
                                    subKey,
                                    ":"),
                                "  ",
                                searchForTermInText(value, searchKeyword));
                        }))));
            }
            return (0, preact_1.h)("tr", null,
                (0, preact_1.h)("td", { class: 'key column' }, key),
                " ",
                (0, preact_1.h)("td", null, searchForTermInText(dict[key], searchKeyword)));
        });
    };
    //@ts-ignore
    return (0, preact_1.h)("div", { class: 'tab-content', hidden: !active },
        (0, preact_1.h)("table", null, renderFields()));
};
const DataTab = ({ data, active, searchKeyword }) => {
    const dataStr = typeof data === 'string' ? data : stringify(data);
    return (0, preact_1.h)("div", { class: 'tab-content', id: 'data-container', hidden: !active }, searchForTermInText(dataStr, searchKeyword));
};
const Icon = ({ name: i }) => {
    return (0, preact_1.h)("span", { class: 'icon', dangerouslySetInnerHTML: { __html: i } });
};
const handleSearchForKeywordClick = (setter, searchBarId) => {
    var _a, _b;
    const keyword = (_b = (_a = document.getElementById(searchBarId)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '';
    setter(keyword);
};
const searchForTermInText = (text, searchKeyword) => {
    let splitOnSearch = [text];
    if (searchKeyword !== '' && typeof text === 'string' && text) {
        splitOnSearch = text.split(searchKeyword);
    }
    return (0, preact_1.h)("span", null, splitOnSearch.map((token, i) => {
        if (i === splitOnSearch.length - 1) {
            return (0, preact_1.h)("span", null, token);
        }
        else {
            return (0, preact_1.h)("span", null,
                token,
                (0, preact_1.h)("span", { dangerouslySetInnerHTML: { __html: `<span class='search-term'>${searchKeyword}</span>` } }));
        }
    }));
};
//# sourceMappingURL=renderer.js.map