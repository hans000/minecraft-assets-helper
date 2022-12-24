/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
import { relative } from 'path'
import { existsSync } from "fs";
import { parsePath } from "../utils";
import { fileURLToPath } from "url";
import { Location, Position, Range, WorkspaceFolder } from "vscode-languageserver";
import { tokenize, parse, findAtPosition, getPathInParent, AST } from "../utils/json-ast";
import { TextDocument } from 'vscode-languageserver-textdocument'
import { DefinitionConfig, definitionConfigList, matchedFile, matchedKeys } from '../config/definition';
import { CACHED_DIRNAME, CACHED_LINK_FILENAME } from '../utils/constants';
import { getPackDirs } from '../utils/workspace';
import { BaseRequest, PackFile } from './core';
import { vanillaSettings } from '..';


export class DefinitionRequest extends BaseRequest {
    private node: AST | undefined

    constructor(textDocument: TextDocument, position: Position, folders: WorkspaceFolder[]) {
        super(textDocument, position, folders)
    }

    private packDirsHandle(folder: WorkspaceFolder, packFile: PackFile, config: DefinitionConfig) {
        const packDirs = getPackDirs(fileURLToPath(folder.uri))
        const result: Location[] = []
        if (packDirs.length) {
            for (const packDir of packDirs) {
                const distName = `${folder.uri}/${packDir}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
                if (existsSync(fileURLToPath(distName))) {
                    result.push(this.createLocation(distName))
                }
            }
        } else {
            const distName = `${folder.uri}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
            if (existsSync(fileURLToPath(distName))) {
                result.push(this.createLocation(distName))
            }
        }
        return result
    }

    private workspaceHandle(relativePath: string, folder: WorkspaceFolder) {
        if ((this.node!.value as string).startsWith('#')) {
            return
        }
        const packFile = new PackFile(this.node)
        const keys = packFile.getKeys()

        for (const config of definitionConfigList) {
            const m1 = matchedKeys(config.pattern, keys)
            const m2 = matchedFile(relativePath, config.fileMatch)
            if (m1 && m2) {
                const result = this.packDirsHandle(folder, packFile, config)
                if (result.length) {
                    return result
                }
    
                if (packFile.namespace !== 'minecraft') {
                    return
                }
                const list = vanillaSettings.links
                const distName = `${folder.uri}/assets/${packFile.namespace}/${config.dist}/${packFile.filename}${config.fileExt}`
                const d = distName.slice(folder.uri.length + 1)
                if (list && list.includes(d)) {
                    return Location.create(`${folder.uri}/${CACHED_DIRNAME}/${CACHED_LINK_FILENAME}`, Range.create(Position.create(0, 0), Position.create(0, 0)))
                }
            }
        }
    }

    public async create() {
        this.node = this.getPositionNode()
        const type = this.node?.parent?.type
        if (type !== 'Object' && type !== 'Array') {
            return
        }
        for (const folder of this.folders) {
            const basePath = relative(folder.uri, this.textDocument.uri)
    
            // 排除非当前工作空间的文件
            if (basePath.startsWith('.')) {
                return
            }
    
            const result = this.workspaceHandle(basePath, folder)
            if (result) {
                return result
            }
        }
    }
}