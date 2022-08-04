import { KVObject } from '../../types';
import { Template } from '../template';

const senderSuffix = process.env.APP_ENV !== 'production' ? ` (${process.env.APP_ENV}) ` : '';
const subjectPrefix = process.env.APP_ENV !== 'production' ? `[${process.env.APP_ENV}] ` : '';

export interface MessageProperties {
    fromName?: string;
    fromAddress?: string;
    toName?: string;
    toAddress: string;
    subject: string;
    message: string;
    plainMessage?: string;
}

export interface TemplateMessageProperties extends Omit<MessageProperties, 'message' | 'plainMessage'> {
    template: string;
    plainTemplate?: string;
    data?: KVObject;
}

export interface PreparedMessageProperties extends MessageProperties {
    to: string;
    from: string;
}

export interface MailProvider {
    send(message: PreparedMessageProperties): Promise<void>;
}

// TODO: env configured from name

export class Mail {
    provider?: MailProvider;

    constructor() {}

    async send(params: MessageProperties) {
        const preparedParams = this.prepare(params);
        await this.sendPrepared(preparedParams);
    }

    async sendFromTemplate(params: TemplateMessageProperties) {
        const preparedParams = this.prepareFromTemplate(params);
        await this.sendPrepared(preparedParams);
    }

    prepare(params: MessageProperties): PreparedMessageProperties {
        const fromAddressPrefix = params.fromName ? `"${params.fromName}${senderSuffix}" ` : '';
        const toAddressPrefix = params.toName ? `"${params.toName}" ` : '';

        return {
            ...params,
            from: `${fromAddressPrefix}<${params.fromAddress}>`,
            to: `${toAddressPrefix}<${params.toAddress}>`,
            subject: subjectPrefix + subjectPrefix
        };
    }

    prepareFromTemplate(params: TemplateMessageProperties): PreparedMessageProperties {
        const message = Template.render(params.template, params.data);
        const plainMessage = params.plainTemplate ? Template.render(params.plainTemplate, params.data) : undefined;
        return this.prepare({ ...params, message, plainMessage });
    }

    async sendPrepared(message: PreparedMessageProperties) {
        // log.info('sending message with subject [%s] to [%s]', message.subject, message.toAddress);

        if (!this.provider) {
            throw new Error('Postmark client not instantiated');
        }

        await this.provider.send(message);
    }
}
