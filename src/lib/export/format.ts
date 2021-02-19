import fs from 'fs'

export abstract class abstractExportFormat {
    fileName: string = ''
    connection: any
    table: string = ''
    schema: string = ''
    filters: any[] = []
    outputOptions: any = {}
    progressCallback: (countTotal: number, countExported: number, fileSize: number) => void

    abstract getHeader(firstRow: any): string | undefined
    abstract getFooter(): string | undefined
    abstract writeChunkToFile(data: any): Promise<void>

    constructor(fileName: string, connection: any, table: string, schema: string, filters: any[], outputOptions: any, progressCallback: (countTotal: number, countExported: number, fileSize: number) => void) {
        this.fileName = fileName
        this.connection = connection
        this.table = table
        this.schema = schema
        this.filters = filters
        this.outputOptions = outputOptions
        this.progressCallback = progressCallback
    }

    async getChunk(offset: Number, limit: Number) {
        const result = await this.connection.selectTop(
            this.table,
            offset,
            limit,
            null,
            this.filters
        );

        return result
    }

    async getFirstRow() {
        const row = await this.getChunk(0, 1)

        if (row.result && row.result.length === 1) {
            return row.result[0]
        }
    }
    
    async writeLineToFile(content: string) {
        return await fs.promises.appendFile(this.fileName, content + "\n")
    }

    async exportToFile(): Promise<any> {
        const chunkSize = 250
        const firstRow = await this.getFirstRow()
        const header = this.getHeader(firstRow)
        const footer = this.getFooter()

        let countExported = 0
        let countTotal = 0

        await fs.promises.open(this.fileName, 'w+')

        if (header) {
            await this.writeLineToFile(header)
        }
        
        do {
            const chunk = await this.getChunk(countExported, chunkSize)
            await this.writeChunkToFile(chunk.result)
            
            countTotal = chunk.totalRecords
            countExported += chunk.result.length
            const stats = await fs.promises.stat(this.fileName)
            this.progressCallback(countTotal, countExported, stats.size)
        } while (countExported < countTotal)

        if (footer) {
            await this.writeLineToFile(footer)
        }

        return Promise.resolve()
    }
}