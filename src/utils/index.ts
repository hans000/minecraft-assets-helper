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

export const parseLineText = (lineText: string, keyword?: string) => {
    const reg = new RegExp(`"${keyword ? keyword : '.+?'}"\\s*:\\s*("(.+:)?(.+))?`)
    const m = reg.exec(lineText)
    if (m) {
        return [
            m[2] ? m[2] : 'minecraft', 
            m[3] ? m[3] : ''
        ]
    }
    return null
}