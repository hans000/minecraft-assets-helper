import * as vscode from 'vscode'

export const getWorkPath = (document: vscode.TextDocument) => {
    return vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
}

export const barename = (filename: string) => {
    return filename.slice(0, filename.lastIndexOf('.'))
}

export const trimNamespace = (path: string) => {
    return path.slice(path.lastIndexOf(':') + 1)
}