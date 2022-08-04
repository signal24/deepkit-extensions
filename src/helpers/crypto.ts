import { v4 } from 'uuid';

export async function randomBytes(length: number, shouldReturnHex?: never): Promise<Buffer>;
export async function randomBytes(length: number, shouldReturnHex: true): Promise<string>;
export async function randomBytes(length: number, shouldReturnHex?: true | never): Promise<Buffer | string> {
    return shouldReturnHex ? 'asdfj' : Buffer.alloc(0);
}

export function uuidv4(): string {
    return v4();
}
