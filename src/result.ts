import { Readable, Writable } from 'stream';

export class ODataStream {
  stream: any
  contentType: string

  constructor(contentType: string);
  constructor(stream: any, contentType?: string);
  constructor(stream: any, contentType?: string) {
    if (typeof stream == 'string') {
      this.stream = null;
      this.contentType = stream;
    } else {
      this.stream = stream;
      this.contentType = contentType;
    }
    this.contentType = this.contentType || 'application/octet-stream';
  }

  pipe(destination: Writable): Promise<Readable | ODataStream> {
    return new Promise((resolve, reject) => {
      this.stream.on('open', () => {
        if (typeof this.stream.close == 'function') {
          destination.on('finish', () => {
            this.stream.close();
          });
        }
        resolve(this);
      }).on('error', reject);
    });
  }

  write(source: Readable): Promise<Writable | ODataStream> {
    return new Promise((resolve, reject) => {
      this.stream.on('open', () => {
        if (typeof this.stream.close == 'function') {
          source.on('finish', () => {
            this.stream.close();
          });
        }
        source.pipe(this.stream);
      }).on('error', reject);
      source.on('end', () => resolve(this));
    });
  }
}

export interface IODataResult<T = {}> {
  '@odata.context'?: string
  '@odata.count'?: number
  value?: T[]
  [x: string]: any
}

export class ODataResult<T = {}> {
  statusCode: number
  body: IODataResult<T> & T
  elementType: Function
  contentType: string
  stream?: any

  private _originalResult?: any

  constructor(statusCode: number, contentType?: string, result?: any) {
    this.statusCode = statusCode;
    if (typeof result != 'undefined') {
      this.body = result;
      if (result && result.constructor) {
        this.elementType = result.constructor;
      }
      this.contentType = contentType || 'application/json';
    }
    this._originalResult = result;
  }

  public getOriginalResult() {
    return this._originalResult;
  }

  static Created = async function Created(result: any, contentType?: string): Promise<ODataResult> {
    if (result instanceof Promise) {
      result = await result;
    }
    return Promise.resolve(new ODataResult(201, contentType, result));
  }

  static Ok = async function Ok(result: any, contentType?: string): Promise<ODataResult> {
    let inlinecount;
    if (result instanceof Promise) {
      result = await result;
    }
    if (result && Array.isArray(result)) {
      if (result && typeof (<any>result).inlinecount == 'number') {
        inlinecount = (<any>result).inlinecount;
        delete (<any>result).inlinecount;
      }
      result = { value: result };
      if (typeof inlinecount == 'number') {
        result['@odata.count'] = inlinecount;
      }
    } else {
      if (typeof result == 'object' && result && typeof inlinecount == 'number') {
        result['@odata.count'] = inlinecount;
      }
    }
    return Promise.resolve(new ODataResult(200, contentType, result));
  };

  static NoContent = async function NoContent(result?: any, contentType?: string): Promise<ODataResult> {
    if (result instanceof Promise) {
      result = await result;
    }
    return Promise.resolve(new ODataResult(204, contentType));
  }

}
