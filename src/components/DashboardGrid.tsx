import { CSSProperties, ReactNode, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, LayoutGrid, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WidgetDef = {
  id: string;
  label: string;
  render: () => ReactNode;
};

type DashboardGridProps = {
  widgets: WidgetDef[];
  layout: string[];
  onLayoutChange: (layout: string[]) => void;
  loaded?: boolean;
};

// ─── Sortable item ─────────────────────────────────────────────────────────────

function SortableItem({
  widget,
  editMode,
  isOverlay,
}: {
  widget: WidgetDef;
  editMode: boolean;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-shadow',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 scale-[1.02] shadow-2xl opacity-95',
      )}
    >
      {/* Drag handle — only visible in edit mode */}
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            'absolute left-0 top-0 z-20 flex h-full w-8 cursor-grab items-center justify-center',
            'rounded-l-xl bg-primary/10 hover:bg-primary/20 active:cursor-grabbing',
            'touch-none select-none transition-colors',
          )}
          title={`Arrastra para mover "${widget.label}"`}
        >
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
      )}

      {/* Widget content — shifted right when edit mode shows handle */}
      <div className={cn('transition-all duration-200', editMode && 'pl-8')}>
        {widget.render()}
      </div>
    </div>
  );
}

// ─── Main grid ─────────────────────────────────────────────────────────────────

export function DashboardGrid({
  widgets,
  layout,
  onLayoutChange,
  loaded = true,
}: DashboardGridProps) {
  const [editMode, setEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  // Ordered list based on current layout (skip unknown ids)
  const orderedWidgets = layout
    .map(id => widgets.find(w => w.id === id))
    .filter(Boolean) as WidgetDef[];

  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = layout.indexOf(active.id as string);
    const newIndex = layout.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onLayoutChange(arrayMove(layout, oldIndex, newIndex));
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  if (!loaded) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end gap-3">
        {editMode && (
          <p className="text-xs text-muted-foreground">
            Arrastra cada tarjeta desde el borde izquierdo para reorganizar
          </p>
        )}
        <Button
          variant={editMode ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setEditMode(v => !v)}
        >
          {editMode ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Listo
            </>
          ) : (
            <>
              <LayoutGrid className="h-3.5 w-3.5" />
              Personalizar
            </>
          )}
        </Button>
      </div>

      {/* Sortable list */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={layout} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {orderedWidgets.map(widget => (
              <SortableItem
                key={widget.id}
                widget={widget}
                editMode={editMode}
              />
            ))}
          </div>
        </SortableContext>

        {/* Floating preview while dragging */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeWidget ? (
            <SortableItem
              widget={activeWidget}
              editMode={true}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
