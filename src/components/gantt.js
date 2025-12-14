// src/components/gantt.js
// Clase principal que coordina tabla, gráfica y divisor

import { createGanttTable } from './ganttTable.js';
import { createGanttChart } from './ganttChart.js';
import { createGanttDivider, enableDividerDrag } from './ganttDivider.js';
import {
    GRANULARITIES,
    durationLabel,
    normalizeTask,
    cloneTasks,
    addUnits,
} from './ganttUtils.js';

export class Gantt {
    constructor(container, tasks = [], options = {}) {
        this.container = container;
        this.tasks = cloneTasks(tasks.map(normalizeTask));
        this.granularity = options.granularity || GRANULARITIES.DAYS;
        this.rowHeight = options.rowHeight || 32;

        // Construir layout
        this.container.classList.add('gantt-container');
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = options.height || '520px';
        this.container.style.border = '1px solid #ddd';
        this.container.style.borderRadius = '6px';
        this.container.style.background = '#fff';

        // PANE superior: encabezados y cuerpo
        this.body = document.createElement('div');
        this.body.className = 'gantt-body';
        this.body.style.flex = '1';
        this.body.style.display = 'flex';
        this.body.style.minHeight = '0'; // para permitir scroll

        // Crear tabla
        this.table = createGanttTable({
            tasks: this.tasks,
            onEdit: (index, field, value) => this.editTask(index, field, value),
            getDurationText: (t) => durationLabel(t.start, t.end, this.granularity),
            rowHeight: this.rowHeight,
        });

        // Crear gráfica
        this.chart = createGanttChart({
            tasks: this.tasks,
            granularity: this.granularity,
            rowHeight: this.rowHeight,
            getTimelineStart: () => this._getTimelineStart(),
            getTimelineEnd: () => this._getTimelineEnd(),
        });

        // Divisor vertical
        this.divider = createGanttDivider();

        // Armar DOM
        const leftPane = this.table.element;
        const rightPane = document.createElement('div');
        rightPane.className = 'gantt-chart-pane';
        rightPane.style.flex = '1';
        rightPane.style.display = 'flex';
        rightPane.style.flexDirection = 'column';
        rightPane.style.minWidth = '300px';

        rightPane.appendChild(this.chart.headerEl);
        rightPane.appendChild(this.chart.scrollXEl);

        // Sincronizar scroll vertical entre tabla y canvas
        this.table.bodyEl.addEventListener('scroll', () => {
            this.chart.scrollXEl.scrollTop = this.table.bodyEl.scrollTop;
        });

        // Activar drag del divisor
        this.body.appendChild(leftPane);
        this.body.appendChild(this.divider);
        this.body.appendChild(rightPane);
        this.container.appendChild(this.body);

        enableDividerDrag(this.divider, leftPane, rightPane, 280, 300);

        // Ajustar alturas internas
        this._layoutHeights();
        window.addEventListener('resize', () => this._layoutHeights());
    }

    _layoutHeights() {
        const headerH = this.chart.headerEl.getBoundingClientRect().height || 64;
        const bodyH = this.container.getBoundingClientRect().height;
        const tableHeaderH = this.table.element.querySelector('.gantt-table-header')?.getBoundingClientRect().height || 36;

        // Altura del área scrollable
        const scrollH = bodyH - Math.max(headerH, 0);
        this.chart.scrollXEl.style.height = `${scrollH - 8}px`;

        // Alinear alto de tabla body con canvas
        const rowsH = this.tasks.length * this.rowHeight;
        this.chart.canvasEl.style.height = `${rowsH}px`;
        this.table.bodyEl.style.maxHeight = `${scrollH - (tableHeaderH ? 0 : 36)}px`;
    }

    _getTimelineStart() {
        if (this.tasks.length === 0) return new Date();
        const minStart = this.tasks.reduce((min, t) => (t.start < min ? t.start : min), this.tasks[0].start);
        // Margen visual de 1 unidad hacia atrás
        return addUnits(minStart, -1, this.granularity);
    }

    _getTimelineEnd() {
        if (this.tasks.length === 0) return addUnits(new Date(), 10, this.granularity);
        const maxEnd = this.tasks.reduce((max, t) => (t.end > max ? t.end : max), this.tasks[0].end);
        // Margen visual de 1 unidad hacia adelante
        return addUnits(maxEnd, 1, this.granularity);
    }

    // API pública

    setGranularity(granularity) {
        this.granularity = granularity;
        this.table.refresh(this.tasks);
        this.chart.refresh(this.tasks, this.granularity);
        this._layoutHeights();
    }

    addTask(task) {
        const t = normalizeTask(task);
        this.tasks.push(t);
        this.table.refresh(this.tasks);
        this.chart.refresh(this.tasks, this.granularity);
        this._layoutHeights();
    }

    editTask(index, field, value) {
        if (index < 0 || index >= this.tasks.length) return;

        const t = this.tasks[index];
        if (field === 'start' || field === 'end') {
            const newDate = new Date(value);
            if (!Number.isNaN(newDate)) {
                t[field] = newDate;
                if (t.end < t.start) {
                    t.end = addUnits(t.start, 1, this.granularity);
                }
            }
        } else if (field === 'name' || field === 'dependency') {
            t[field] = String(value ?? '');
        }

        this.table.refresh(this.tasks);
        this.chart.refresh(this.tasks, this.granularity);
        this._layoutHeights();
    }

    // Exportar a imagen (PNG)
    async exportAsImage() {
        if (typeof window.html2canvas === 'undefined') {
            alert('html2canvas no está disponible. Incluye el script de CDN en index.html.');
            return;
        }
        const canvas = await window.html2canvas(this.container, { scale: 2 });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'gantt.png';
        link.click();
    }

    // Exportar a PDF
    async exportAsPDF() {
        if (typeof window.html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
            alert('html2canvas o jsPDF no están disponibles. Incluye ambos scripts de CDN en index.html.');
            return;
        }
        const canvas = await window.html2canvas(this.container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('l', 'pt', 'a4'); // orientación horizontal
        const pageWidth = pdf.internal.pageSize.getWidth();

        // Ajustar imagen al ancho de la página manteniendo relación de aspecto
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * pageWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save('gantt.pdf');
    }
}
