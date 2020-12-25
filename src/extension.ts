// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs'
import * as path from 'path'
import definitionProvider from './providers/definitionProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const completionDisposable = vscode.languages.registerCompletionItemProvider('json', {
		provideCompletionItems: (document, position, token, context) => {
			const line = document.lineAt(position);
			const lineText = line.text.substring(0, position.character);
			if(/(^|=| )\w+\.dependencies\.$/g.test(lineText)) {
				return ['a1', 'a2'].map(dep => {
					return new vscode.CompletionItem(dep);
				});
			}
		},
		resolveCompletionItem: () => null
	}, '.');
	
	context.subscriptions.push(completionDisposable);

	const defDisposable = vscode.languages.registerDefinitionProvider('json', {
		provideDefinition: definitionProvider
	})
	context.subscriptions.push(defDisposable);
}
// this method is called when your extension is deactivated
export function deactivate() {}
