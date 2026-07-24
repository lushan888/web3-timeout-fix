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
import { InvalidClientError, MethodNotImplementedError, ResponseError } from 'web3-errors';
import { HttpProviderOptions } from './types.js';

export { HttpProviderOptions } from './types.js';

/**
 * Create an AbortSignal that combines the configured timeout with
 * any user-provided signal, picking the shorter deadline when both exist.
 */
function createTimeoutSignal(
	timeoutMs?: number,
	userSignal?: AbortSignal,
): AbortSignal | undefined {
	if (!timeoutMs && !userSignal) return undefined;

	const timeoutSignal = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined;

	if (!userSignal) return timeoutSignal;
	if (!timeoutSignal) return userSignal;

	// Combine: abort when either fires (whichever is sooner)
	return AbortSignal.any([timeoutSignal, userSignal]);
}

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

		// Extract timeout from constructor options and build a timeout signal
		const timeoutMs = this.httpProviderOptions?.timeout;
		const userSignal = providerOptionsCombined.signal;
		const effectiveSignal = createTimeoutSignal(timeoutMs, userSignal);
		if (effectiveSignal) {
			providerOptionsCombined.signal = effectiveSignal;
		}

		const response = await fetch(this.clientUrl, {
			...providerOptionsCombined,
			method: 'POST',
			headers: {
				...providerOptionsCombined.headers,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			throw new ResponseError(await response.json(), undefined, undefined, response.status);
		}

		return (await response.json()) as JsonRpcResponseWithResult<ResultType>;
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