/*
 * The MIT License (MIT)
 * Copyright (c) 2023 hans000
 */
import { existsSync, readdirSync } from 'fs'

export function getPackDirs(dirname: string) {
    const dirs = readdirSync(dirname).filter(dir => !dir.startsWith('.'))
    return dirs.filter(dir => isAssetPack(`${dirname}/${dir}`))
}

export function isAssetPack(dirname: string) {
    return existsSync(`${dirname}/assets`) && existsSync(`${dirname}/pack.mcmeta`)
}

export function isMultiAssetsPack(dirname: string) {
    return !!getPackDirs(dirname).length
}