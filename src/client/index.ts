/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import * as path from 'path'
import { workspace, ExtensionContext } from 'vscode'

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node'

let client: LanguageClient

export function activate(context: ExtensionContext) {
	const serverModule = context.asAbsolutePath(path.join('out', 'server', 'index.js'))

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	}

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
            { scheme: 'file', language: 'json' },
        ],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		},
		middleware: {
			executeCommand: async (command, args, next) => {
				return next(command, args)
			}
		}
	}

	// Create the language client and start the client.
	client = new LanguageClient(
		'assetsLanguageServer',
		'Assets Language Server',
		serverOptions,
		clientOptions
	)

	// Start the client. This will also launch the server
	client.start()
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined
	}
	return client.stop()
}
