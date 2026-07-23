/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/

import fetch from 'cross-fetch';
import {
	EthExecutionAPI,
	JsonRpcResponseWithResult,
	Web3APIMethod,
	Web3APIPayload,
	Web3APIReturnType,
	Web3APISpec,
	Web3BaseProvider,
	Web3ProviderStatus,
} from 'web3-types';
import { InvalidClientError, MethodNotImplementedError, OperationTimeoutError, ResponseError } from 'web3-errors';
import { HttpProviderOptions } from './types.js';

export { HttpProviderOptions } from './types.js';

export default class HttpProvider<
	API extends Web3APISpec = EthExecutionAPI,
> extends Web3BaseProvider<API> {
	private readonly clientUrl: string;
	private readonly httpProviderOptions: HttpProviderOptions | undefined;

	public constructor(clientUrl: string, httpProviderOptions?: HttpProviderOptions) {
		super();
		if (!HttpProvider.validateClientUrl(clientUrl)) throw new InvalidClientError(clientUrl);
		this.clientUrl = clientUrl;
		this.httpProviderOptions = httpProviderOptions;
	}

	private static validateClientUrl(clientUrl: string): boolean {
		return typeof clientUrl === 'string' ? /^http(s)?:\/\//i.test(clientUrl) : false;
	}

	/* eslint-disable class-methods-use-this */
	public getStatus(): Web3ProviderStatus {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public supportsSubscriptions() {
		return false;
	}

	public async request<
		Method extends Web3APIMethod<API>,
		ResultType = Web3APIReturnType<API, Method>,
	>(
		payload: Web3APIPayload<API, Method>,
		requestOptions?: RequestInit,
	): Promise<JsonRpcResponseWithResult<ResultType>> {
		const providerOptionsCombined = {
			...this.httpProviderOptions?.providerOptions,
			...requestOptions,
		};

		// Read timeout from the top-level httpProviderOptions
		const timeoutMs = this.httpProviderOptions?.timeout;

		let abortController: AbortController | undefined;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		if (timeoutMs !== undefined && timeoutMs > 0) {
			abortController = new AbortController();
			timeoutId = setTimeout(() => {
				abortController?.abort();
			}, timeoutMs);
		}

		// Build fetch options, merging any existing user signal with our timeout signal
		let fetchSignal: AbortSignal | undefined;
		if (abortController && providerOptionsCombined.signal) {
			// Both timeout and user-provided signal exist
			fetchSignal = AbortSignal.any
				? AbortSignal.any([abortController.signal, providerOptionsCombined.signal as AbortSignal])
				: abortController.signal;
		} else if (abortController) {
			fetchSignal = abortController.signal;
		} else if (providerOptionsCombined.signal) {
			fetchSignal = providerOptionsCombined.signal as AbortSignal;
		}

		try {
			const response = await fetch(this.clientUrl, {
				...providerOptionsCombined,
				signal: fetchSignal,
				method: 'POST',
				headers: {
					...providerOptionsCombined.headers as Record<string, string> | undefined,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				throw new ResponseError(await response.json(), undefined, undefined, response.status);
			}

			return (await response.json()) as JsonRpcResponseWithResult<ResultType>;
		} catch (error: unknown) {
			if (timeoutMs !== undefined && timeoutMs > 0 && abortController?.signal.aborted) {
				if (
					(error instanceof DOMException && error.name === 'AbortError') ||
					(error instanceof Error && error.name === 'AbortError')
				) {
					throw new OperationTimeoutError(`Request timed out after ${timeoutMs}ms`);
				}
			}
			throw error;
		} finally {
			if (timeoutId !== undefined) {
				clearTimeout(timeoutId);
			}
		}
	}

	/* eslint-disable class-methods-use-this */
	public on() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public removeListener() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public once() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public removeAllListeners() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public connect() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public disconnect() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public reset() {
		throw new MethodNotImplementedError();
	}

	/* eslint-disable class-methods-use-this */
	public reconnect() {
		throw new MethodNotImplementedError();
	}
}

export { HttpProvider };