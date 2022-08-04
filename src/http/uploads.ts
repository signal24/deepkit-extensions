import { PassthroughPropertyDecoratorResult } from '../helpers/decorators';

export class FileUpload {
    path: string;
    size: number;
    type: string;
    originalName: string;
}
export interface IUploadOptions {
    allowedTypes?: string[];
    maxSize?: number;
}
export function UploadOptions(options: IUploadOptions) {
    return PassthroughPropertyDecoratorResult;
}
