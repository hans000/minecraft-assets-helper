/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import { relative, dirname, resolve, basename } from "path";
import { CompletionItem, CompletionItemKind, WorkspaceFolder } from "vscode-languageserver";
import { Position, TextDocument } from "vscode-languageserver-textdocument";
import { DefinitionConfig, definitionConfigList, matchedFile, matchedKeys } from "../config/definition";
import { tokenize, getPathInObject } from "../utils/json-ast";
import { promisify } from 'util'
import { existsSync, readdir, statSync } from "fs";
import { getLastValue, parsePath, uniq, uniqBy } from "../utils";
import { BaseRequest } from "./core";
import { getPackDirs } from "../utils/workspace";
import { fileURLToPath } from "url";

const readdirAsync = promisify(readdir)

export class CompletionRequest extends BaseRequest {
    private anchorBeforeText = ''

    constructor(textDocument: TextDocument, position: Position, folders: WorkspaceFolder[]) {
        super(textDocument, position, folders)
        const text = this.textDocument.getText()
        const offset = this.textDocument.offsetAt(this.position)
        this.anchorBeforeText = text.slice(0, offset)
    }

    private async getNamespaceCompletions(packDirs: string[]) {
        const namespaces: string[] = []
        if (packDirs.length) {
            for (const packDir of packDirs) {
                namespaces.push(...(await readdirAsync(`${packDir}/assets`)))
            }
        } else {
            namespaces.push(...(await readdirAsync('assets')))
        }
        return uniq(['minecraft', ...namespaces]).map<CompletionItem>(namespace => {
            return {
                label: namespace,
                insertText: namespace,
                kind: CompletionItemKind.Folder,
                detail: 'namespace',
            }
        })
    }

    private async getFilenameCompletions(packDirs: string[], config: DefinitionConfig, value: string) {
        const m = parsePath(value)
        if (! m) {
            return
        }

        async function handle(dir: string, packDir: string) {
            const result: CompletionItem[] = []
            if (! existsSync(dir)) {
                return result
            }

            const files = await readdirAsync(dir)
            for (const file of files) {
                const stat = statSync(resolve(dir, file))
                const isFile = stat.isFile()
                if (isFile && !file.endsWith(config.fileExt)) {
                    continue
                }
                const label = isFile ? basename(file, config.fileExt) : file
                const kind = isFile ? CompletionItemKind.File : CompletionItemKind.Folder
                result.push({
                    label,
                    kind,
                    detail: packDir,
                })
            }
            return result
        }
        
        const [namespace, filename] = m
        const result: CompletionItem[] = []
        if (packDirs.length) {
            for (const packDir of packDirs) {
                const dir = `${packDir}/assets/${namespace}/${config.dist}/${filename.endsWith('/') ? filename : dirname(filename)}`
                result.push(...(await handle(dir, packDir)))
            }
        } else {
            const dir = `assets/${namespace}/${config.dist}/${filename.endsWith('/') ? filename : dirname(filename)}`
            result.push(...(await handle(dir, '')))
        }

        return result
    }

    private async workspaceHandle(basePath: string, folder: WorkspaceFolder, keys: string[]) {
        for (const config of definitionConfigList) {
            const m1 = matchedKeys(config.pattern, keys)
            const m2 = matchedFile(basePath, config.fileMatch)
            if (m1 && m2) {
                const value = getLastValue(this.anchorBeforeText)
                const packDirs = getPackDirs(fileURLToPath(folder.uri))

                if (/^[-\w]+:/.test(value)) {
                    return await this.getFilenameCompletions(packDirs, config, value)
                } else if (! value.includes('/')) {
                    return await this.getNamespaceCompletions(packDirs)
                }
            }
        }
    }

    public async create() {
        const tokens = tokenize(this.anchorBeforeText)
        const [keys, nextWillKey] = getPathInObject(tokens)

        if (! nextWillKey) {
            return []
        }

        for (const folder of this.folders) {
            const basePath = relative(folder.uri, this.textDocument.uri)

            // 排除非当前工作空间的文件
            if (basePath.startsWith('.')) {
                return
            }

            const result = await this.workspaceHandle(basePath, folder, keys)
            if (result) {
                return uniqBy(result, item => item.label)
            }
        }
    }
}