export class Grid {
    constructor(container, data) {
        this.container = document.querySelector(container);
        this.data = data;
        this.render();
    }

    render() {
        const table = document.createElement("table");
        this.data.forEach(row => {
            const tr = document.createElement("tr");
            row.forEach(cell => {
                const td = document.createElement("td");
                td.textContent = cell;
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });
        this.container.innerHTML = "";
        this.container.appendChild(table);
    }

    update(newData) {
        this.data = newData;
        this.render();
    }
}