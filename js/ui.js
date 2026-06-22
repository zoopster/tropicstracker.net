// Small shared UI helpers.

export function sectionHead(icon, title, subtitle) {
    return `
        <div class="section-head">
            <h1><i class="fas ${icon}" aria-hidden="true"></i> ${title}</h1>
            ${subtitle ? `<p>${subtitle}</p>` : ""}
        </div>`;
}

export function placeholder({ icon, title, body, sprint }) {
    return `
        <div class="placeholder">
            <div class="ph-icon"><i class="fas ${icon}" aria-hidden="true"></i></div>
            <h2>${title}</h2>
            <p>${body}</p>
            ${sprint ? `<div class="sprint-tag">Planned: ${sprint}</div>` : ""}
        </div>`;
}

// Escape user-facing strings before injecting into innerHTML.
export function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
}
