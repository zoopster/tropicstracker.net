import { sectionHead, esc } from "../ui.js";
import { VIEWS, PRODUCTS, imageUrl, sliderUrl, loopUrl } from "../data/satellite.js";

const REFRESH_MS = 5 * 60 * 1000; // imagery updates roughly every few minutes

let viewId = "atl";
let productId = "GEOCOLOR";
let refreshTimer = null;

export default {
    id: "satellite",
    label: "Satellite",
    icon: "fa-satellite",

    render() {
        return (
            sectionHead("fa-satellite", "GOES Satellite",
                "Latest GOES-East / West imagery for the tropics. Source: NOAA NESDIS. Open the interactive viewer for animated loops.") +
            `<div class="track-toolbar">
                <div class="seg" id="sat-views" role="group" aria-label="Region">
                    ${VIEWS.map((v) => `<button class="seg-btn" data-view="${v.id}">${esc(v.label)}</button>`).join("")}
                </div>
             </div>
             <div class="track-toolbar">
                <div class="seg" id="sat-products" role="group" aria-label="Product">
                    ${PRODUCTS.map((p) => `<button class="seg-btn" data-product="${p.id}">${esc(p.label)}</button>`).join("")}
                </div>
                <span class="track-spacer" style="flex:1"></span>
                <a class="btn" id="sat-slider" target="_blank" rel="noopener"><i class="fas fa-clapperboard" aria-hidden="true"></i> Interactive viewer</a>
                <a class="btn" id="sat-loop" target="_blank" rel="noopener"><i class="fas fa-film" aria-hidden="true"></i> Animated loop</a>
             </div>
             <div class="sat-stage">
                <div class="sat-loading" id="sat-loading"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading imagery...</div>
                <img id="sat-img" class="sat-img" alt="" hidden>
                <div class="sat-error" id="sat-error" hidden>
                    <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
                    <p>This imagery is unavailable right now. Try another region or the interactive viewer.</p>
                </div>
             </div>
             <p class="sat-caption" id="sat-caption"></p>`
        );
    },

    async mount(root) {
        clearInterval(refreshTimer);

        root.querySelectorAll("[data-view]").forEach((b) =>
            b.addEventListener("click", () => { viewId = b.dataset.view; update(root); })
        );
        root.querySelectorAll("[data-product]").forEach((b) =>
            b.addEventListener("click", () => { productId = b.dataset.product; update(root); })
        );

        update(root);

        refreshTimer = setInterval(() => {
            if (document.getElementById("sat-img")) refreshImage(root);
            else clearInterval(refreshTimer);
        }, REFRESH_MS);
    },
};

function currentView() { return VIEWS.find((v) => v.id === viewId) || VIEWS[0]; }
function currentProduct() { return PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0]; }

function update(root) {
    // Active states on the segmented controls.
    root.querySelectorAll("[data-view]").forEach((b) =>
        b.classList.toggle("active", b.dataset.view === viewId)
    );
    root.querySelectorAll("[data-product]").forEach((b) =>
        b.classList.toggle("active", b.dataset.product === productId)
    );

    const view = currentView();
    const product = currentProduct();

    root.querySelector("#sat-slider").href = sliderUrl(view, product);
    root.querySelector("#sat-loop").href = loopUrl(view, product.id);
    root.querySelector("#sat-caption").textContent =
        `${view.label} · ${product.label} · ${view.sat.replace("GOES", "GOES-")}`;

    refreshImage(root);
}

function refreshImage(root) {
    const img = root.querySelector("#sat-img");
    const loading = root.querySelector("#sat-loading");
    const error = root.querySelector("#sat-error");
    if (!img) return;

    const view = currentView();
    const product = currentProduct();
    const url = imageUrl(view, product.id, Date.now());

    loading.hidden = false;
    error.hidden = true;
    img.hidden = true;

    img.onload = () => {
        loading.hidden = true;
        error.hidden = true;
        img.hidden = false;
    };
    img.onerror = () => {
        loading.hidden = true;
        img.hidden = true;
        error.hidden = false;
    };
    img.alt = `${view.label} ${product.label} GOES satellite imagery`;
    img.src = url;
}
