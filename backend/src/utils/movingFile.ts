import { existsSync, mkdirSync } from 'fs'
import { rename } from 'fs/promises'
import { basename, join } from 'path'

async function movingFile(imagePath: string, from: string, to: string) {
    const fileName = basename(imagePath)
    const imagePathTemp = join(from, fileName)
    const imagePathPermanent = join(to, fileName)

    mkdirSync(to, { recursive: true })
    if (!existsSync(imagePathTemp)) {
        throw new Error('Ошибка при сохранении файла')
    }

    await rename(imagePathTemp, imagePathPermanent)
}

export default movingFile
