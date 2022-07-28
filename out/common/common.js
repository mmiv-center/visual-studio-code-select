export const DEBUG_MODE = false;
export const NAME = 'select-book';
export const MIME_TYPE = 'x-application/select-book';
export function formatURL(url) {
    if (!url.startsWith('http')) {
        return `http://${url}`;
    }
    return url;
}
export function logDebug(item) {
    if (DEBUG_MODE) {
        console.log(item);
    }
}
//# sourceMappingURL=common.js.map