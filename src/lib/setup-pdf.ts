'use client';

import { pdfjs } from 'react-pdf';

if (typeof window !== 'undefined') {
    // Use unpkg to serve the worker. Ensure version matches react-pdf's dependency.
    // We can use the version property exported by pdfjs.
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}
