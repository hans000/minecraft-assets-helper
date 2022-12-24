/*
 * The MIT License (MIT)
 * Copyright (c) 2022 hans000
 */
export interface DefinitionConfig {
    fileExt: string
    fileMatch: string[]
    dist: string
    pattern: Array<{ type: string, key: string} | string>
}

export function matchedKeys(pattern: Array<{ type: string, key: string} | string>, keys: string[]) {
    for (let i = 0; i < pattern.length; i++) {
        let p = pattern[pattern.length - i - 1]
        p = typeof p === 'object' ? p.key : p
        const k = keys[keys.length - i - 1]
        if (p !== '*' && k !== p) {
            return false
        }
    }
    return true
}

export function matchedFile(relativePath: string, fileMatch: string[]) {
    const reg = new RegExp(`assets\\\\(.+)\\\\${fileMatch.join('\\\\')}\\\\(.+)`)
    return reg.test(relativePath)
}

export const definitionConfigList: DefinitionConfig[] = [
    {
        fileExt: '.json',
        fileMatch: ['blockstates'],
        dist: 'models',
        pattern: ['variants', '*', 'model'],
    },
    {
        fileExt: '.json',
        fileMatch: ['blockstates'],
        dist: 'models',
        pattern: ['multipart', '*', { type: 'Array', key: 'apply' }, '*', 'model'],
    },
    {
        fileExt: '.json',
        fileMatch: ['blockstates'],
        dist: 'models',
        pattern: ['multipart', '*', { type: 'Object', key: 'apply' }, 'model'],
    },
    {
        fileExt: '.json',
        fileMatch: ['models', 'block'],
        dist: 'models',
        pattern: ['parent'],
    },
    {
        fileExt: '.png',
        fileMatch: ['models', 'block'],
        dist: 'textures',
        pattern: ['textures', '*'],
    },
    {
        fileExt: '.json',
        fileMatch: ['models', 'item'],
        dist: 'models',
        pattern: ['parent'],
    },
    {
        fileExt: '.png',
        fileMatch: ['models', 'item'],
        dist: 'textures',
        pattern: ['textures', '*'],
    },
    {
        fileExt: '.png',
        fileMatch: ['particles'],
        dist: 'textures/particle',
        pattern: ['textures', '*'],
    },
    {
        fileExt: '',
        fileMatch: ['font'],
        dist: 'textures',
        pattern: ['providers', '*', 'file'],
    },
]