import { PDFDocument, degrees } from 'pdf-lib';
import { PDFPage } from './types';

export async function mergeAndSavePDF(pages: PDFPage[]): Promise<void> {
    const mergedPdf = await PDFDocument.create();
    const sourceDocsCache = new Map<string, PDFDocument>();

    for (const page of pages) {
        const file = page.file;
        const key = file.name + file.lastModified;

        let sourcePdf = sourceDocsCache.get(key);
        if (!sourcePdf) {
            const arrayBuffer = await file.arrayBuffer();
            sourcePdf = await PDFDocument.load(arrayBuffer);
            sourceDocsCache.set(key, sourcePdf);
        }

        const [copiedPage] = await mergedPdf.copyPages(sourcePdf, [page.pageIndex]);

        const existingRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(existingRotation + page.rotation));

        mergedPdf.addPage(copiedPage);
    }

    const pdfBytes = await mergedPdf.save();

    // Trigger download
    // Type assertion to bypass ArrayBufferLike mismatch issues in strict environments
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'merged-document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
