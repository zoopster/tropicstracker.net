import { sectionHead, esc } from "../ui.js";
import { resourceGroups } from "../data/resources.js";

function cardHtml(group) {
    const items = group.links
        .map(
            (l) =>
                `<li data-name="${esc(l.name.toLowerCase())}">
                    <a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)}</a>
                </li>`
        )
        .join("");
    return `
        <div class="resource-card" data-group>
            <h2><i class="fas ${group.icon}" aria-hidden="true"></i> ${esc(group.title)}</h2>
            <ul>${items}</ul>
        </div>`;
}

export default {
    id: "resources",
    label: "Resources",
    icon: "fa-compass",
    render() {
        const count = resourceGroups.reduce((n, g) => n + g.links.length, 0);
        return (
            sectionHead("fa-compass", "Resource Hub",
                `The best NHC, satellite, radar, and model resources in one place. ${count} curated links.`) +
            `<input class="resources-search" id="res-search" type="search"
                    placeholder="Filter resources..." aria-label="Filter resources">
             <div class="resources-grid" id="res-grid">
                ${resourceGroups.map(cardHtml).join("")}
             </div>
             <p class="res-empty" id="res-empty" hidden style="color:var(--text-dim)">No resources match that filter.</p>`
        );
    },
    mount(root) {
        const input = root.querySelector("#res-search");
        const grid = root.querySelector("#res-grid");
        const empty = root.querySelector("#res-empty");
        if (!input) return;

        input.addEventListener("input", () => {
            const q = input.value.trim().toLowerCase();
            let anyVisible = false;

            grid.querySelectorAll("[data-group]").forEach((card) => {
                let groupVisible = false;
                card.querySelectorAll("li[data-name]").forEach((li) => {
                    const match = !q || li.dataset.name.includes(q);
                    li.hidden = !match;
                    if (match) groupVisible = true;
                });
                card.hidden = !groupVisible;
                if (groupVisible) anyVisible = true;
            });

            empty.hidden = anyVisible;
        });
    },
};
