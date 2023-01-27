/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import { existsSync } from 'fs'
import { relative } from 'path'
import { fileURLToPath } from 'url'
import { Position, TextDocument } from 'vscode-languageserver-textdocument'
import { Diagnostic, DiagnosticSeverity, WorkspaceFolder } from 'vscode-languageserver/node'
import { DefinitionConfig, definitionConfigList } from '../config/definition'
import { getNodesByPath, tokenize, parse, AST } from '../utils/json-ast'
import { vanillaSettings } from '..'
import { getPackDirs } from '../utils/workspace'
import { BaseRequest, PackFile } from './core'

function toRange(node: AST) {
    return {
        start: {
            line: node.position!.startLineNumber - 1,
            character: node.position!.startColumn - 1,
        },
        end: {
            line: node.position!.endLineNumber - 1,
            character: node.position!.endColumn - 3,
        },
    }
}

function createDuagnostic(range: any, severity: DiagnosticSeverity = DiagnosticSeverity.Warning) {
    return {
        severity,
        range,
        message: severity === DiagnosticSeverity.Hint ? '检测到可能引用了原版或其他库文件' : `检测到可能缺少此引用文件`,
        source: 'Assets Helper Server'
    }
}

export class DiagnosticRequest extends BaseRequest {
    private node: AST | undefined

    constructor(textDocument: TextDocument, position: Position, folders: WorkspaceFolder[]) {
        super(textDocument, position, folders)
    }

    public create() {
        this.node = this.getAst()
        const diagnostics: Diagnostic[] = []
    
        if (! this.node) {
            return diagnostics
        }
    
        for (const folder of this.folders) {
            const basePath = relative(folder.uri, this.textDocument.uri)
    
            // 排除非当前工作空间的文件
            if (basePath.startsWith('.')) {
                continue
            }

            diagnostics.push(...this.workspaceHandle(basePath, folder))
        }
    
        return diagnostics
    }

    private packDirsHandle(folder: WorkspaceFolder, packFile: PackFile, config: DefinitionConfig, range: any) {
        const diagnostics: Diagnostic[] = []
        const packDirs = getPackDirs(fileURLToPath(folder.uri))

        if (packDirs.length) {
            for (const packDir of packDirs) {
                const distName = `${folder.uri}/${packDir}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
                if (existsSync(fileURLToPath(distName))) {
                    return diagnostics
                }
            }
            for (const packDir of packDirs) {
                const distName = `${folder.uri}/${packDir}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
                const list = vanillaSettings.links
                const d = distName.slice((folder.uri.length + packDir.length) + 2)
                if (list && list.includes(d)) {
                    diagnostics.push(createDuagnostic(range, DiagnosticSeverity.Hint))
                    return diagnostics
                }
            }
            diagnostics.push(createDuagnostic(range))
        } else {
            const distName = `${folder.uri}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
            if (! existsSync(fileURLToPath(distName))) {
                const list = vanillaSettings.links
                const d = distName.slice(folder.uri.length + 1)
                if (list && list.includes(d)) {
                    diagnostics.push(createDuagnostic(range, DiagnosticSeverity.Hint))
                    return diagnostics
                }
                diagnostics.push(createDuagnostic(range))
            }
        }
    
        return diagnostics
    }

    private workspaceHandle(basePath: string, folder: WorkspaceFolder) {
        const diagnostics: Diagnostic[] = []

        for (const config of definitionConfigList) {
            const reg = new RegExp(`assets\\\\(.+)\\\\${config.fileMatch.join('\\\\')}.+$`)
            const m = reg.exec(basePath)
            if (m) {
                try {
                    const nodes = getNodesByPath(this.node!, config.pattern)
                    nodes.forEach(node => {
                        // 添加白名单
                        if ((node.value as string).startsWith('#')) {
                            return
                        }
                        if (['builtin/generated', 'builtin/entity'].includes((node.value as string))) {
                            return
                        }
                        const range = toRange(node)
                        const packFile = new PackFile(node)
                        if (! packFile.isValid()) {
                            return
                        }
                        const result = this.packDirsHandle(folder, packFile, config, range)
                        diagnostics.push(...result)
                    })
                } catch (error) {
                    
                }
            }
        }
        return diagnostics
    }
}