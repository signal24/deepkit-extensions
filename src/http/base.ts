import { eventDispatcher } from '@deepkit/event';
import { HttpError, HttpListener, HttpNotFoundError, HttpResponseEvent, httpWorkflow } from '@deepkit/http';
import { ItemNotFound } from '@deepkit/orm';
import formidable, { Fields, Files } from 'formidable';

import { r } from '../app';

// we need to add a transition from route to response to fix logging for middleware responses
httpWorkflow.addTransition('route', 'response');

export class HttpWorkflowListener {
    // the default behavior for parameter resolver throws is to report an
    // internal error. however, there are legitimate use cases for this, so
    // let's enable those use cases

    // middleware may send a response. this shouldn't kill our workflow, though,
    // as we still want to log the output. we can create a new response event because
    // the default handlers won't do anything if data's already been sent.
    @eventDispatcher.listen(httpWorkflow.onRoute, 200)
    onRoute(event: typeof httpWorkflow.onRoute.event) {
        if (event.response.writableEnded) {
            event.clearNext();
            event.next('response', new HttpResponseEvent(event.injectorContext, event.request, event.response, null));
        }
    }

    // todo: if a controller uses an optional on a param, it should just return undefined
    // rather than throwing
    @eventDispatcher.listen(httpWorkflow.onParametersFailed)
    onParametersFailed(event: typeof httpWorkflow.onParametersFailed.event) {
        // ORM not found should throw 404
        if (event.error instanceof ItemNotFound) {
            event.stopPropagation();
            event.error = new HttpNotFoundError();
            r(HttpListener).onControllerError(event);
        }

        // HTTP errors should pass through
        else if (event.error instanceof HttpError) {
            event.stopPropagation();
            r(HttpListener).onControllerError(event);
        }
    }
}

// todo: PR per-route file filter to deepkit

// enable _payload field for JSON submissions during multipart file uploads
const originalParse = formidable.IncomingForm.prototype.parse;
formidable.IncomingForm.prototype.parse = function (request, callback) {
    return originalParse.call(this, request, (err: any, fields: Fields, files: Files) => {
        if (typeof fields._payload === 'string') {
            try {
                fields = JSON.parse(fields._payload);
                // eslint-disable-next-line no-empty
            } catch {}
        }
        callback?.(err, fields, files);
    });
};
