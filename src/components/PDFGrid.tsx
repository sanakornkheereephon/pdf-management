'use client';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState } from 'react';
import { Document, Page } from 'react-pdf';
import { PDFPage } from '@/lib/types';
import '@/lib/setup-pdf';
import { RotateCw, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PDFGridProps {
    pages: PDFPage[];
    onRotate: (id: string) => void;
    onDelete: (id: string) => void;
    onReorder: (newPages: PDFPage[]) => void;
}

export function PDFGrid({ pages, onRotate, onDelete, onReorder }: PDFGridProps) {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require drag movement of 8px to start
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = pages.findIndex((page) => page.id === active.id);
            const newIndex = pages.findIndex((page) => page.id === over.id);
            onReorder(arrayMove(pages, oldIndex, newIndex));
        }
        setActiveId(null);
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={pages.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
                    {pages.map((page) => (
                        <SortablePDFCard
                            key={page.id}
                            page={page}
                            onRotate={() => onRotate(page.id)}
                            onDelete={() => onDelete(page.id)}
                        />
                    ))}
                </div>
            </SortableContext>

            <DragOverlay dropAnimation={{
                sideEffects: defaultDropAnimationSideEffects({
                    styles: {
                        active: {
                            opacity: '0.4',
                        },
                    },
                }),
            }}>
                {activeId ? (
                    <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                        <PDFCard
                            page={pages.find(p => p.id === activeId)!}
                            onRotate={() => { }}
                            onDelete={() => { }}
                            isOverlay
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortablePDFCard(props: { page: PDFPage; onRotate: () => void; onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: props.page.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : 1,
        opacity: isDragging ? 0.3 : 1
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <PDFCard {...props} />
        </div>
    );
}

function PDFCard({
    page,
    onRotate,
    onDelete,
    isOverlay
}: {
    page: PDFPage;
    onRotate: () => void;
    onDelete: () => void;
    isOverlay?: boolean;
}) {
    return (
        <div className={clsx(
            "relative group bg-white rounded-lg shadow-sm transition-all duration-200 border border-gray-200 overflow-hidden aspect-[3/4]",
            isOverlay ? "shadow-xl border-blue-400" : "hover:shadow-md"
        )}>
            {/* Actions Overlay */}
            <div className={clsx(
                "absolute top-2 right-2 z-10 flex gap-2 transition-opacity duration-200",
                isOverlay ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                    onClick={(e) => { e.stopPropagation(); onRotate(); }}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-blue-50 text-gray-700 hover:text-blue-600 shadow-sm transition-colors border border-gray-100"
                    title="Rotate"
                >
                    <RotateCw className="w-4 h-4" />
                </button>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-red-50 text-gray-700 hover:text-red-600 shadow-sm transition-colors border border-gray-100"
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* PDF Page Rendering */}
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                <Document
                    file={page.previewUrl}
                    loading={
                        <div className="flex items-center justify-center h-full w-full">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500/50" />
                        </div>
                    }
                    error={
                        <div className="text-xs text-red-500 text-center p-2">
                            Failed to load
                        </div>
                    }
                >
                    <Page
                        pageIndex={page.pageIndex}
                        width={250} // Approximate width for thumbnail
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        rotate={page.rotation as 0 | 90 | 180 | 270}
                        className="shadow-sm max-w-full h-auto object-contain pointer-events-none select-none" // prevent interaction with canvas
                    />
                </Document>
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm p-2 text-xs text-center text-gray-500 border-t border-gray-100 font-medium">
                Page {page.pageIndex + 1}
            </div>
        </div>
    );
}
