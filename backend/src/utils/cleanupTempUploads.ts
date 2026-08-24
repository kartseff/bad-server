import { readdir, stat, unlink } from 'fs/promises'
import path from 'path'
import { UPLOAD_PATH_TEMP } from '../config'

const MAX_TEMP_FILE_AGE = 60 * 60 * 1000

const cleanupTempUploads = async () => {
    const directory = path.join(__dirname, `../public/${UPLOAD_PATH_TEMP}`)
    try {
        const entries = await readdir(directory, { withFileTypes: true })
        const now = Date.now()
        await Promise.all(
            entries
                .filter((entry) => entry.isFile() && entry.name !== '.gitkeep')
                .map(async (entry) => {
                    const filePath = path.join(directory, entry.name)
                    const fileStat = await stat(filePath)
                    if (now - fileStat.mtimeMs > MAX_TEMP_FILE_AGE) {
                        await unlink(filePath)
                    }
                })
        )
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
        }
    }
}

export default cleanupTempUploads
