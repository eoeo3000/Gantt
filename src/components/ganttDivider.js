// src/components/ganttDivider.js

export function createGanttDivider() {
    const divider = document.createElement('div');
    divider.className = 'gantt-divider';

    // Estilos básicos
    divider.style.width = '6px';
    divider.style.cursor = 'col-resize';
    divider.style.background = 'linear-gradient(90deg, #ddd, #bbb, #ddd)';
    divider.style.flex = '0 0 6px';
    divider.style.zIndex = '5';

    return divider;
}

export function enableDividerDrag(divider, leftPane, rightPane, minLeft = 240, minRight = 300) {
    let dragging = false;
    let startX = 0;
    let startLeftWidth = 0;

    divider.addEventListener('mousedown', (e) => {
        dragging = true;
        startX = e.clientX;
        startLeftWidth = leftPane.getBoundingClientRect().width;
        document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const newLeftWidth = Math.max(minLeft, startLeftWidth + dx);
        const containerWidth = leftPane.parentElement.getBoundingClientRect().width;
        const maxLeftWidth = containerWidth - minRight - divider.getBoundingClientRect().width;
        leftPane.style.flex = `0 0 ${Math.min(newLeftWidth, maxLeftWidth)}px`;
    });

    window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = '';
    });
}
