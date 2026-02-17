export interface PDFPage {
    id: string; // unique id for dnd
    file: File;
    previewUrl: string; // Object URL for rendering
    pageIndex: number; // 0-based index in the original file
    rotation: number; // 0, 90, 180, 270
}
