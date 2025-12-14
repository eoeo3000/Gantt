// src/components/ganttChart.js
// Construye la gráfica derecha con escala de tiempo y barras alineadas

import { GRANULARITIES, UNIT_WIDTHS, unitsBetween, addUnits, unitLabel } from './ganttUtils.js';

export function createGanttChart({
    tasks,
    granularity,
    rowHeight = 32,
    getTimelineStart,
    getTimelineEnd,
}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gantt-chart-wrapper';
    wrapper.style.flex = '1';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.overflow = 'hidden';

    // Encabezado de tiempo (uno o dos niveles)
    const timeHeader = document.createElement('div');
    timeHeader.className = 'gantt-time-header';
    timeHeader.style.flex = '0 0 auto';
    timeHeader.style.borderBottom = '1px solid #ddd';
    timeHeader.style.background = '#fafafa';

    // Contenedor scrollable horizontal
    const scrollX = document.createElement('div');
    scrollX.className = 'gantt-chart-scroll';
    scrollX.style.flex = '1';
    scrollX.style.overflowX = 'auto';
    scrollX.style.overflowY = 'hidden';
    scrollX.style.position = 'relative';

    const canvas = document.createElement('div');
    canvas.className = 'gantt-canvas';
    canvas.style.position = 'relative';
    canvas.style.height = `${tasks.length * rowHeight}px`;

    scrollX.appendChild(canvas);

    function buildTimeline() {
        timeHeader.innerHTML = '';

        const start = getTimelineStart();
        const end = getTimelineEnd();

        const unitW = UNIT_WIDTHS[granularity];
        const totalUnits = Math.max(unitsBetween(start, end, granularity), 1);
        const totalWidth = totalUnits * unitW;

        canvas.style.width = `${totalWidth}px`;

        // Para granularidad horas: dos niveles (días arriba, horas abajo)
        if (granularity === GRANULARITIES.HOURS) {
            const top = document.createElement('div');
            top.style.display = 'flex';
            top.style.borderBottom = '1px solid #eee';
            top.style.fontWeight = '600';
            top.style.fontSize = '12px';

            const bottom = document.createElement('div');
            bottom.style.display = 'flex';
            bottom.style.fontSize = '12px';

            // Construir bloques de días y horas
            let cursor = new Date(start);
            while (cursor < end) {
                const currentDay = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
                const nextDay = addUnits(currentDay, 1, GRANULARITIES.DAYS);
                const dayEnd = nextDay < end ? nextDay : end;

                const hoursInDay = unitsBetween(currentDay, dayEnd, GRANULARITIES.HOURS);
                const dayBlock = document.createElement('div');
                dayBlock.style.flex = `0 0 ${hoursInDay * unitW}px`;
                dayBlock.style.borderRight = '1px solid #eee';
                dayBlock.style.padding = '6px 8px';
                dayBlock.style.whiteSpace = 'nowrap';
                dayBlock.style.overflow = 'hidden';
                dayBlock.style.textOverflow = 'ellipsis';
                const label = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
                dayBlock.textContent = label;
                top.appendChild(dayBlock);

                for (let h = 0; h < hoursInDay; h++) {
                    const hourCell = document.createElement('div');
                    hourCell.style.flex = `0 0 ${unitW}px`;
                    hourCell.style.borderRight = '1px solid #f0f0f0';
                    hourCell.style.padding = '4px';
                    hourCell.style.textAlign = 'center';
                    hourCell.textContent = String(h).padStart(2, '0');
                    bottom.appendChild(hourCell);
                }

                cursor = dayEnd;
            }

            timeHeader.appendChild(top);
            timeHeader.appendChild(bottom);
        } else {
            // Un solo nivel para días o semanas
            const single = document.createElement('div');
            single.style.display = 'flex';
            single.style.fontSize = '12px';

            let cursor = new Date(start);
            for (let i = 0; i < totalUnits; i++) {
                const cell = document.createElement('div');
                cell.style.flex = `0 0 ${unitW}px`;
                cell.style.borderRight = '1px solid #f0f0f0';
                cell.style.padding = '4px';
                cell.style.textAlign = 'center';
                cell.style.whiteSpace = 'nowrap';
                cell.style.overflow = 'hidden';
                cell.style.textOverflow = 'ellipsis';
                cell.textContent = unitLabel(cursor, granularity);
                single.appendChild(cell);
                cursor = addUnits(cursor, 1, granularity);
            }

            timeHeader.appendChild(single);
        }
    }

    function buildBars() {
        canvas.innerHTML = ''; // limpiar barras

        const start = getTimelineStart();
        const unitW = UNIT_WIDTHS[granularity];

        tasks.forEach((t, idx) => {
            const bar = document.createElement('div');
            bar.className = 'gantt-bar';
            bar.style.position = 'absolute';
            bar.style.height = `${Math.max(rowHeight - 8, 20)}px`;
            bar.style.top = `${idx * rowHeight + 4}px`;
            bar.style.borderRadius = '4px';
            bar.style.background = '#3b82f6';
            bar.style.opacity = '0.85';

            // Calcular posición
            const offsetUnits = Math.max(unitsBetween(start, t.start, granularity), 0);
            const lengthUnits = Math.max(unitsBetween(t.start, t.end, granularity), 0);
            const left = offsetUnits * unitW;
            const width = Math.max(lengthUnits * unitW, 6);

            bar.style.left = `${left}px`;
            bar.style.width = `${width}px`;

            // Etiqueta de dependencia como tag junto a la barra
            if (t.dependency) {
                const tag = document.createElement('div');
                tag.textContent = t.dependency;
                tag.style.position = 'absolute';
                tag.style.left = `${left + width + 6}px`;
                tag.style.top = `${idx * rowHeight + 4}px`;
                tag.style.fontSize = '11px';
                tag.style.background = '#e5f0ff';
                tag.style.border = '1px solid #c6ddff';
                tag.style.color = '#1e3a8a';
                tag.style.padding = '2px 6px';
                tag.style.borderRadius = '3px';
                tag.style.whiteSpace = 'nowrap';
                tag.style.pointerEvents = 'none';
                canvas.appendChild(tag);
            }

            canvas.appendChild(bar);
        });
    }

    // Inicial
    buildTimeline();
    buildBars();

    function refresh(newTasks, newGranularity) {
        tasks = newTasks;
        granularity = newGranularity;
        buildTimeline();
        buildBars();
    }

    return {
        element: wrapper,
        headerEl: timeHeader,
        scrollXEl: scrollX,
        canvasEl: canvas,
        refresh,
    };
}
