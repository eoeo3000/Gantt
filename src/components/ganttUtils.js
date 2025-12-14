// src/components/ganttUtils.js

export const GRANULARITIES = {
    DAYS: 'days',
    HOURS: 'hours',
    WEEKS: 'weeks',
};

export const UNIT_WIDTHS = {
    [GRANULARITIES.DAYS]: 32,   // px por día
    [GRANULARITIES.HOURS]: 18,  // px por hora
    [GRANULARITIES.WEEKS]: 45,  // px por semana
};

// Devuelve número de unidades entre start y end dependiendo de granularidad
export function unitsBetween(start, end, granularity) {
    const s = new Date(start);
    const e = new Date(end);
    const ms = e - s;
    if (ms <= 0) return 0;

    switch (granularity) {
        case GRANULARITIES.DAYS: {
            const oneDay = 24 * 60 * 60 * 1000;
            return Math.ceil(ms / oneDay);
        }
        case GRANULARITIES.HOURS: {
            const oneHour = 60 * 60 * 1000;
            return Math.ceil(ms / oneHour);
        }
        case GRANULARITIES.WEEKS: {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            return Math.ceil(ms / oneWeek);
        }
        default:
            return 0;
    }
}

// Suma n unidades a una fecha según granularidad
export function addUnits(date, n, granularity) {
    const d = new Date(date);
    switch (granularity) {
        case GRANULARITIES.DAYS:
            d.setDate(d.getDate() + n);
            break;
        case GRANULARITIES.HOURS:
            d.setHours(d.getHours() + n);
            break;
        case GRANULARITIES.WEEKS:
            d.setDate(d.getDate() + n * 7);
            break;
    }
    return d;
}

// Etiqueta de unidad para la escala de tiempo
export function unitLabel(date, granularity) {
    const d = new Date(date);
    const pad = (x) => String(x).padStart(2, '0');
    switch (granularity) {
        case GRANULARITIES.DAYS:
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        case GRANULARITIES.HOURS:
            return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00`;
        case GRANULARITIES.WEEKS:
            return `W${getWeekNumber(d)} ${d.getFullYear()}`;
        default:
            return '';
    }
}

// Número de semana ISO
export function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// Etiqueta de duración para mostrar en la tabla
export function durationLabel(start, end, granularity) {
    const n = unitsBetween(start, end, granularity);
    switch (granularity) {
        case GRANULARITIES.DAYS:
            return `${n} día${n !== 1 ? 's' : ''}`;
        case GRANULARITIES.HOURS:
            return `${n} hora${n !== 1 ? 's' : ''}`;
        case GRANULARITIES.WEEKS:
            return `${n} semana${n !== 1 ? 's' : ''}`;
        default:
            return `${n}`;
    }
}

// Normaliza tarea a estructura estándar
export function normalizeTask(task) {
    return {
        name: task.name ?? '',
        start: task.start ? new Date(task.start) : new Date(),
        end: task.end ? new Date(task.end) : addUnits(new Date(), 1, GRANULARITIES.DAYS),
        dependency: task.dependency ?? '',
    };
}

// Clona profundamente tareas simples
export function cloneTasks(tasks) {
    return tasks.map(t => ({
        name: t.name,
        start: new Date(t.start),
        end: new Date(t.end),
        dependency: t.dependency ?? '',
    }));
}
