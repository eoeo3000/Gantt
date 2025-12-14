// src/components/ganttTable.js
// Construye la tabla izquierda con autoajuste, edición y redimensionamiento

const COLUMNS = [
    { key: 'name', label: 'Nombre' },
    { key: 'start', label: 'Fecha de inicio' },
    { key: 'end', label: 'Fecha de término' },
    { key: 'duration', label: 'Duración', readonly: true },
    { key: 'dependency', label: 'Dependencia' },
];

const MIN_COL_WIDTH = 80;

export function createGanttTable({ tasks, onEdit, getDurationText, rowHeight = 32 }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gantt-table-wrapper';
    wrapper.style.flex = '0 0 420px'; // ancho inicial
    wrapper.style.minWidth = '280px';
    wrapper.style.maxWidth = '60%';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.borderRight = '1px solid #e5e5e5';
    wrapper.style.overflow = 'hidden'; // sin scroll horizontal

    const header = document.createElement('div');
    header.className = 'gantt-table-header';
    header.style.display = 'grid';
    header.style.gridAutoRows = '36px';
    header.style.borderBottom = '1px solid #ddd';
    header.style.userSelect = 'none';

    const body = document.createElement('div');
    body.className = 'gantt-table-body';
    body.style.flex = '1';
    body.style.overflowY = 'auto';
    body.style.overflowX = 'hidden';

    // Para sincronizar scroll vertical externamente, exponemos body
    wrapper._body = body;

    const colEls = [];
    const colWidths = new Array(COLUMNS.length).fill(MIN_COL_WIDTH);

    function textCellStyles(el) {
        el.style.whiteSpace = 'nowrap';
        el.style.overflow = 'hidden';
        el.style.textOverflow = 'ellipsis';
        el.style.padding = '6px 8px';
    }

    function buildHeader() {
        header.innerHTML = '';
        header.style.gridTemplateColumns = colWidths.map(w => `${w}px`).join(' ');
        COLUMNS.forEach((col, idx) => {
            const cell = document.createElement('div');
            cell.className = 'gantt-th';
            cell.style.position = 'relative';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.background = '#f8f8f8';
            cell.style.fontWeight = '600';
            cell.style.fontSize = '13px';
            textCellStyles(cell);
            cell.textContent = col.label;

            // Resizer
            const resizer = document.createElement('div');
            resizer.className = 'col-resizer';
            resizer.style.position = 'absolute';
            resizer.style.right = '0';
            resizer.style.top = '0';
            resizer.style.width = '6px';
            resizer.style.height = '100%';
            resizer.style.cursor = 'col-resize';
            resizer.style.borderRight = '1px solid #ddd';
            resizer.style.boxSizing = 'border-box';

            let startX = 0;
            let startW = 0;
            let dragging = false;

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                dragging = true;
                startX = e.clientX;
                startW = colWidths[idx];
                document.body.style.userSelect = 'none';
            });

            window.addEventListener('mousemove', (e) => {
                if (!dragging) return;
                const dx = e.clientX - startX;
                const newW = Math.max(MIN_COL_WIDTH, startW + dx);
                colWidths[idx] = newW;
                header.style.gridTemplateColumns = colWidths.map(w => `${w}px`).join(' ');
                Array.from(body.children).forEach(row => {
                    row.style.gridTemplateColumns = colWidths.map(w => `${w}px`).join(' ');
                });
            });

            window.addEventListener('mouseup', () => {
                if (!dragging) return;
                dragging = false;
                document.body.style.userSelect = '';
            });

            cell.appendChild(resizer);
            header.appendChild(cell);
            colEls.push(cell);
        });
    }

    function measureText(text, font = '13px system-ui') {
        const canvas = measureText._canvas || (measureText._canvas = document.createElement('canvas'));
        const ctx = canvas.getContext('2d');
        ctx.font = font;
        return ctx.measureText(text).width + 20; // padding aproximado
    }

    function autoFitColumns() {
        // Calcular anchuras basadas en encabezados y contenido inicial
        COLUMNS.forEach((col, idx) => {
            let maxW = Math.max(MIN_COL_WIDTH, measureText(col.label, '600 13px system-ui'));
            tasks.forEach(t => {
                const value = col.key === 'duration'
                    ? getDurationText(t)
                    : col.key === 'start' || col.key === 'end'
                        ? formatDateCell(t[col.key])
                        : (t[col.key] ?? '');
                maxW = Math.max(maxW, measureText(String(value)));
            });
            colWidths[idx] = Math.ceil(maxW);
        });
    }

    function formatDateCell(d) {
        if (!d) return '';
        const dt = new Date(d);
        const pad = (x) => String(x).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:00`;
    }

    function buildBody() {
        body.innerHTML = '';
        tasks.forEach((t, rowIndex) => {
            const row = document.createElement('div');
            row.className = 'gantt-tr';
            row.style.display = 'grid';
            row.style.gridTemplateColumns = colWidths.map(w => `${w}px`).join(' ');
            row.style.height = `${rowHeight}px`;
            row.style.borderBottom = '1px solid #eee';

            COLUMNS.forEach((col) => {
                const cell = document.createElement('div');
                cell.className = 'gantt-td';
                cell.style.display = 'flex';
                cell.style.alignItems = 'center';
                textCellStyles(cell);

                const editable = !col.readonly;
                const input = document.createElement('div');
                input.contentEditable = editable ? 'true' : 'false';
                input.style.outline = 'none';
                input.style.width = '100%';

                // Valor inicial
                let value = '';
                if (col.key === 'duration') {
                    value = getDurationText(t);
                } else if (col.key === 'start' || col.key === 'end') {
                    value = formatDateCell(t[col.key]);
                } else {
                    value = t[col.key] ?? '';
                }
                input.textContent = value;

                if (editable) {
                    input.addEventListener('blur', () => {
                        let newValue = input.textContent.trim();
                        if (col.key === 'start' || col.key === 'end') {
                            const parsed = parseDateFlexible(newValue, t[col.key]);
                            onEdit?.(rowIndex, col.key, parsed);
                        } else {
                            onEdit?.(rowIndex, col.key, newValue);
                        }
                    });

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            input.blur();
                        }
                    });
                } else {
                    input.setAttribute('aria-readonly', 'true');
                }

                cell.appendChild(input);
                row.appendChild(cell);
            });

            body.appendChild(row);
        });
    }

    function parseDateFlexible(text, fallback) {
        if (!text) return new Date(fallback || Date.now());
        const iso = Date.parse(text);
        if (!Number.isNaN(iso)) return new Date(iso);

        const m = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}))?:?(\d{2})?$/);
        if (m) {
            const [_, Y, M, D, H] = m;
            const dt = new Date(Number(Y), Number(M) - 1, Number(D), Number(H || 0), 0, 0);
            return dt;
        }
        const dflt = new Date(text);
        return Number.isNaN(dflt) ? new Date(fallback || Date.now()) : dflt;
    }

    // Inicialización
    autoFitColumns();
    buildHeader();
    buildBody();

    // API de actualización simple
    function refresh(newTasks) {
        tasks = newTasks;
        autoFitColumns();
        buildHeader();
        buildBody();
    }

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    return {
        element: wrapper,
        bodyEl: body,
        getColumnWidths: () => [...colWidths],
        setColumnWidths: (widths) => {
            if (!Array.isArray(widths) || widths.length !== COLUMNS.length) return;
            widths.forEach((w, i) => colWidths[i] = Math.max(MIN_COL_WIDTH, Number(w)));
            buildHeader();
            buildBody();
        },
        refresh,
    };
}

