import * as vscode from 'vscode';
import definitionProvider from './providers/definitionProvider';
import completionProvider from './providers/completionProvider';
import renameProvider from './providers/renameProvider';

export function activate(context: vscode.ExtensionContext) {
	
	context.subscriptions.push(vscode.languages.registerDefinitionProvider('json', {
		provideDefinition: definitionProvider,
	}));

	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(['json', 'javascript'], {
		provideCompletionItems: completionProvider,
	}, ...['"', '/']))

	// context.subscriptions.push(vscode.languages.registerRenameProvider('json', {
	// 	provideRenameEdits: renameProvider,
	// }))
}
export function deactivate() {}
