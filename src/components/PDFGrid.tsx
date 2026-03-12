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
import { RotateCw, RotateCcw, Trash2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface PDFGridProps {
    pages: PDFPage[];
    selectedIds: string[];
    onToggleSelection: (id: string, isMulti: boolean, isRange: boolean) => void;
    onRotate: (id: string, direction: 'cw' | 'ccw') => void;
    onDelete: (id: string) => void;
    onReorder: (newPages: PDFPage[]) => void;
}

export function PDFGrid({ pages, selectedIds, onToggleSelection, onRotate, onDelete, onReorder }: PDFGridProps) {
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
            const activeId = active.id as string;
            const overId = over.id as string;

            const isDraggingSelected = selectedIds.includes(activeId);

            if (isDraggingSelected && selectedIds.length > 1) {
                // Multi-item reordering
                const oldIndex = pages.findIndex(p => p.id === activeId);
                const overIndex = pages.findIndex(p => p.id === overId);

                // Get all selected pages in their CURRENT order
                const selectedPages = pages.filter(p => selectedIds.includes(p.id));
                const nonSelectedPages = pages.filter(p => !selectedIds.includes(p.id));

                // Find where to insert the group
                // We want to insert it relative to the 'over' item
                const newPages = [...nonSelectedPages];
                const insertIndex = newPages.findIndex(p => p.id === overId);

                // If we are moving down, insert after 'over', else before 'over'
                const finalInsertIndex = overIndex > oldIndex ? insertIndex + 1 : insertIndex;

                newPages.splice(finalInsertIndex, 0, ...selectedPages);
                onReorder(newPages);
            } else {
                // Single-item reordering
                const oldIndex = pages.findIndex((page) => page.id === activeId);
                const newIndex = pages.findIndex((page) => page.id === overId);
                onReorder(arrayMove(pages, oldIndex, newIndex));
            }
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
                            isSelected={selectedIds.includes(page.id)}
                            onSelect={(isMulti, isRange) => onToggleSelection(page.id, isMulti, isRange)}
                            onRotate={(direction) => onRotate(page.id, direction)}
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
                    <div className="opacity-90 rotate-2 scale-105 cursor-grabbing relative">
                        <PDFCard
                            page={pages.find(p => p.id === activeId)!}
                            isSelected={selectedIds.includes(activeId)}
                            onSelect={() => { }}
                            onRotate={() => { }}
                            onDelete={() => { }}
                            isOverlay
                        />
                        {selectedIds.includes(activeId) && selectedIds.length > 1 && (
                            <div className="absolute -top-3 -right-3 bg-blue-600 text-white text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-blue-600/20 animate-in zoom-in duration-300">
                                {selectedIds.length}
                            </div>
                        )}
                        {selectedIds.includes(activeId) && selectedIds.length > 1 && (
                            <>
                                <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg -z-10 translate-x-2 translate-y-2 opacity-50"></div>
                                <div className="absolute inset-0 bg-white border border-gray-200 rounded-lg -z-20 translate-x-4 translate-y-4 opacity-25"></div>
                            </>
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

function SortablePDFCard(props: {
    page: PDFPage;
    isSelected: boolean;
    onSelect: (isMulti: boolean, isRange: boolean) => void;
    onRotate: (direction: 'cw' | 'ccw') => void;
    onDelete: () => void
}) {
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
    isSelected,
    onSelect,
    onRotate,
    onDelete,
    isOverlay
}: {
    page: PDFPage;
    isSelected: boolean;
    onSelect: (isMulti: boolean, isRange: boolean) => void;
    onRotate: (direction: 'cw' | 'ccw') => void;
    onDelete: () => void;
    isOverlay?: boolean;
}) {
    const isImage = page.file.type === 'image/jpeg' || page.file.type === 'image/png';

    return (
        <div className={clsx(
            "relative group bg-white rounded-lg shadow-sm transition-all duration-200 border overflow-hidden aspect-[3/4]",
            isSelected ? "border-blue-500 shadow-md ring-1 ring-blue-500/20" : "border-gray-200 hover:shadow-md",
            isOverlay ? "shadow-xl border-blue-400 scale-[1.02]" : ""
        )}>
            {/* Actions Overlay */}
            <div className={clsx(
                "absolute top-2 right-2 z-10 flex gap-2 transition-opacity duration-200",
                isOverlay ? "opacity-0" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                    onClick={(e) => { e.stopPropagation(); onRotate('ccw'); }}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-blue-50 text-gray-700 hover:text-blue-600 shadow-sm transition-colors border border-gray-100"
                    title="Rotate CCW"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
                <button
                    onPointerDown={(e) => e.stopPropagation()} // Stop drag start
                    onClick={(e) => { e.stopPropagation(); onRotate('cw'); }}
                    className="p-1.5 bg-white/90 rounded-full hover:bg-blue-50 text-gray-700 hover:text-blue-600 shadow-sm transition-colors border border-gray-100"
                    title="Rotate CW"
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

            {/* Selection Checkbox */}
            <div
                className={clsx(
                    "absolute top-2 left-2 z-10 transition-all duration-200",
                    isSelected ? "opacity-100 scale-110" : "opacity-0 group-hover:opacity-100 scale-100",
                    isOverlay && "opacity-0"
                )}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(e.ctrlKey || e.metaKey, e.shiftKey);
                }}
            >
                <div className={clsx(
                    "w-5 h-5 rounded-md border shadow-sm flex items-center justify-center transition-colors",
                    isSelected
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white/90 border-gray-300 hover:border-blue-400"
                )}>
                    {isSelected && (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Main Selection Area */}
            <div
                className="absolute inset-0 z-[1] cursor-pointer"
                onClick={(e) => {
                    onSelect(e.ctrlKey || e.metaKey, e.shiftKey);
                }}
            />

            {/* Active Highlight Border */}
            <div className={clsx(
                "absolute inset-0 ring-2 ring-blue-500 ring-inset transition-opacity duration-200 z-[2] pointer-events-none rounded-lg",
                isSelected ? "opacity-100" : "opacity-0"
            )} />

            {/* Image or PDF Page Rendering */}
            <div className="w-full h-full flex items-center justify-center bg-gray-50/50">
                {isImage ? (
                    <img
                        src={page.previewUrl}
                        alt={`Page ${page.pageIndex + 1}`}
                        className="max-w-full max-h-full object-contain pointer-events-none select-none"
                        style={{
                            transform: `rotate(${page.rotation}deg)`
                        }}
                    />
                ) : (
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
                )}
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm p-2 text-xs text-center text-gray-500 border-t border-gray-100 font-medium">
                Page {page.pageIndex + 1}
            </div>
        </div>
    );
}
