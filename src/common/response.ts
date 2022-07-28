import { MessageChannel } from 'worker_threads';
import { logDebug } from './common';
import { ResponseHeaderField } from './httpConstants';
import { RequestParser } from './request';
import * as secrets from './secrets';

export interface ResponseRendererElements {
    status: number,
    statusText: string,
    headers?: any | undefined,
    config?: any | undefined,
    request?: any | undefined,
    data: any
 }

export class ResponseParser {
    private status: number| undefined;
    private statusText: string | undefined;
    private headers: any | undefined;
    private config: any | undefined;
    private request: any | undefined;
    private data: any | undefined;
    private jobs: any | undefined;
    private ast: any | undefined;

    private reqParser: RequestParser;

    constructor(response: any, request: any, reqParser: RequestParser) {
        logDebug(response);
        this.reqParser = reqParser;

        let res = response;

        if(response.response && response.status === undefined) {
            res = response.response;
        }

        try {
            // these are placeholders, should be replaced with our output values
            var d = JSON.parse(res.data);
            if (typeof d.matches == 'undefined') {
                d.matches = 0;
            }

            this.status = d.matches;
            this.statusText = (d.matches == 1) ? "match" : "matches";

            // cyclical reference so we need to cherry pick fields
            this.headers = {};

            for(const field of Object.values(ResponseHeaderField)) {
                if (typeof res.headers !== 'undefined' && typeof res.headers[field.toLowerCase()] != 'undefined')
                   this.headers[field] = res.headers[field.toLowerCase()]; 
            }

            // we should parse this and create some info on the page, number of files etc..
            this.config = {
                timeout: res.config.timeout,
                xsrfCookieName: res.config.xsrfCookieName,
                xsrfHeaderName: res.config.xsrfHeaderName,
                pathToProject: res.headers.workSpaceDir, // "this is a path to the location",
                headers: res.config.headers
            };

            
            delete request.method;
            delete request.baseURL;
            delete request.url;

            /*this.request = {
                method: res.request.method,
                httpVersion:  res.request.res.httpVersion,
                responseUrl: res.request.res.responseUrl
            }; */
            this.request = {};

            //this.request = { ...this.request, ...request };

            this.data = res.data;
            this.jobs = res.headers.jobs;
            if (typeof res.headers !== 'undefined' && typeof res.headers.ast !== 'undefined')
                this.ast = res.headers.ast;
            else
                this.ast = {};

            // get a list of all the jobs and put them in here
            // we should have a better table for this... not just a key-value store

            // we would like to have key-value pairs here
            //this.headers.jobs = this.jobs;
            //this.headers['job01'] = 'a job to do';
            if (this.jobs.length == 0) {
                this.headers['No jobs'] = 'No jobs';
            }

            for (var i = 0; i < this.jobs.length; i++) {
                var numStudies = this.jobs[i].length;
                var numSeries = Object.keys(this.jobs[i]).length;
                this.headers['job' + i] = "Studies: " + numStudies + " Series: " + numSeries; // number of studies
            }

            this._cleanForSecrets();
        } catch {
            throw new Error(response.message);
        }
    }

    json() {
        var d;
        if (typeof this.data === 'string') {
            d = JSON.parse(this.data);
        } else if (typeof this.data === 'object') {
            d = this.data;
        }

        if (typeof this.data.data !== 'undefined') {
            this.data.data = JSON.parse(this.data.data);
        }

        return {
            status: d["matches"],
            statusText: "matches",
            headers: this.headers,
            config: this.config,
            request: this.request,
            messages: d['messages'],
            data: d
        };
    }

    html() {
        if (typeof this.data !== 'undefined') {
            var json = JSON.stringify(JSON.parse(this.data), null, " ");
            return json;
        }
        return "nothing" // "<code>" + this.data.replace(/(?:\r\n|\r|\n)/g, '<br>').replace(/ /g, "&nbsp;") + "</code>";
    }

    renderer(): ResponseRendererElements {
        if (typeof this.status === 'undefined' || !this.statusText || this.data === undefined) {
            throw new Error("Corrupt response received! Missing one or more of response status, status text, and/or data!");
        }

        return {
            status: this.status!,
            statusText: this.statusText!,
            headers: this.headers,
            config: this.config,
            request: this.request,
            data: this.data!
        };
    }

    private _cleanForSecrets() {
        try {
            // only need to clean config and request
            if(this.request.responseUrl && this.reqParser.wasReplacedBySecret(this.request.responseUrl)) {
                this.request.responseUrl = secrets.cleanForSecrets(this.request.responseUrl);
            }

            if(this.request.data && typeof this.request.data === 'string' && this.reqParser.wasReplacedBySecret(this.request.data)) {
                this.request.data = secrets.cleanForSecrets(this.request.data);
            }

            if(this.request.headers && typeof this.request.headers === 'object') {
                for(let key of Object.keys(this.request.headers)) {
                    if(this.reqParser.wasReplacedBySecret(this.request.headers[key])) {
                        this.request.headers[key] = secrets.cleanForSecrets(this.request.headers[key]);
                    }
                }
            }

            if(this.request.params && typeof this.request.params === 'object') {
                for(let key of Object.keys(this.request.params)) {
                    if(this.reqParser.wasReplacedBySecret(this.request.params[key])) {
                        this.request.params[key] = secrets.cleanForSecrets(this.request.params[key]);
                    }
                }
            }

            if(this.config.headers && typeof this.config.headers === 'object') {
                for(let key of Object.keys(this.config.headers)) {
                    if(this.reqParser.wasReplacedBySecret(this.config.headers[key])) {
                        this.config.headers[key] = secrets.cleanForSecrets(this.config.headers[key]);
                    }
                }
            } else if(this.config.headers && typeof this.config.headers === 'string' && this.reqParser.wasReplacedBySecret(this.config.headers)) {
                this.config.headers = secrets.cleanForSecrets(this.config.headers);
            }
        } catch (e) {
            console.log(e);
        }
    }
}