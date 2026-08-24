import { unlink } from 'fs/promises'
import mongoose, { Document, UpdateQuery } from 'mongoose'
import { basename, join } from 'path'

export interface IFile {
    fileName: string
    originalName: string
}

export interface IProduct extends Document {
    title: string
    image: IFile
    category: string
    description: string
    price: number
}

const cardsSchema = new mongoose.Schema<IProduct>(
    {
        title: {
            type: String,
            unique: true,
            required: [true, 'Поле "title" должно быть заполнено'],
            minlength: [2, 'Минимальная длина поля "title" - 2'],
            maxlength: [30, 'Максимальная длина поля "title" - 30'],
        },
        image: {
            fileName: {
                type: String,
                required: [true, 'Поле "image.fileName" должно быть заполнено'],
            },
            originalName: String,
        },
        category: {
            type: String,
            required: [true, 'Поле "category" должно быть заполнено'],
            maxlength: 50,
        },
        description: {
            type: String,
            maxlength: 5000,
        },
        price: {
            type: Number,
            default: null,
        },
    },
    { versionKey: false }
)

cardsSchema.index({ title: 'text' })

const getImagePath = (fileName: string) =>
    join(__dirname, '../public/images', basename(fileName))

const removeImage = async (fileName: string) => {
    try {
        await unlink(getImagePath(fileName))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw error
        }
    }
}

cardsSchema.pre('findOneAndUpdate', async function deleteOldImage() {
    const update = this.getUpdate() as UpdateQuery<IProduct> | null
    const updateImage = update?.$set?.image as IFile | undefined
    const docToUpdate = await this.model.findOne(this.getQuery())
    if (
        updateImage &&
        docToUpdate &&
        updateImage.fileName !== docToUpdate.image.fileName
    ) {
        await removeImage(docToUpdate.image.fileName)
    }
})

cardsSchema.post('findOneAndDelete', async (doc: IProduct) => {
    if (doc?.image?.fileName) {
        await removeImage(doc.image.fileName)
    }
})

export default mongoose.model<IProduct>('product', cardsSchema)
