import { RequestParser } from './request';
export interface ResponseRendererElements {
    status: number;
    statusText: string;
    headers?: any | undefined;
    config?: any | undefined;
    request?: any | undefined;
    input_data?: any | undefined;
    data: any;
}
export declare class ResponseParser {
    private status;
    private statusText;
    private headers;
    private config;
    private request;
    private data;
    private jobs;
    private input_data;
    private ast;
    private reqParser;
    constructor(response: any, request: any, reqParser: RequestParser);
    json(): {
        status: any;
        statusText: string;
        headers: any;
        config: any;
        request: any;
        messages: any;
        input_data: any;
        data: any;
    };
    html(): string;
    renderer(): ResponseRendererElements;
    private _cleanForSecrets;
}
