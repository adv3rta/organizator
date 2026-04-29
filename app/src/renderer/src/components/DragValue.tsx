import { useRef } from "react";

interface DragValueProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onChange: (value: number) => void;
}

const clamp = (value: number, min?: number, max?: number): number => {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
};

export const DragValue = ({
  label,
  value,
  min,
  max,
  step = 1,
  precision = 2,
  onChange
}: DragValueProps) => {
  const startValueRef = useRef(value);
  const pointerIdRef = useRef<number | null>(null);

  return (
    <div className="drag-value">
      <span className="drag-value-label">{label}</span>
      <div className="drag-value-control">
        <button
          type="button"
          className="drag-value-surface"
          onPointerDown={(event) => {
            pointerIdRef.current = event.pointerId;
            startValueRef.current = value;
            const target = event.currentTarget;
            target.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (pointerIdRef.current !== event.pointerId || event.buttons === 0) return;
            const next = clamp(startValueRef.current + event.movementX * step, min, max);
            onChange(Number(next.toFixed(precision)));
          }}
          onPointerUp={(event) => {
            if (pointerIdRef.current === event.pointerId) {
              event.currentTarget.releasePointerCapture(event.pointerId);
              pointerIdRef.current = null;
            }
          }}
        >
          Drag
        </button>
        <input
          className="drag-value-input"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={Math.max(step, 0.01)}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        />
      </div>
    </div>
  );
};
