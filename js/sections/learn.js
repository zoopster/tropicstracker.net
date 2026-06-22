import { sectionHead } from "../ui.js";

// Saffir-Simpson scale, color-coded with the shared category tokens.
const SCALE = [
    { name: "Tropical Depression", winds: "≤ 38 mph", color: "--accent-bright", note: "Organized system with defined circulation but minimal threat." },
    { name: "Tropical Storm", winds: "39–73 mph", color: "--cat-ts", note: "Named storm with potential for damage to vegetation and signs." },
    { name: "Category 1", winds: "74–95 mph", color: "--cat-1", note: "Minimal hurricane with some damage to roofing and siding." },
    { name: "Category 2", winds: "96–110 mph", color: "--cat-2", note: "Moderate hurricane with extensive damage to roofing and siding." },
    { name: "Category 3", winds: "111–129 mph", color: "--cat-3", note: "Major hurricane causing devastating damage to structures." },
    { name: "Category 4", winds: "130–156 mph", color: "--cat-4", note: "Extreme hurricane with catastrophic damage to structures." },
    { name: "Category 5", winds: "≥ 157 mph", color: "--cat-5", note: "Catastrophic hurricane causing total destruction of structures." },
];

function scaleHtml() {
    return SCALE.map((s) => `
        <div class="scale-item" style="border-left-color:var(${s.color})">
            <div class="scale-cat" style="color:var(${s.color})">${s.name}</div>
            <div class="scale-winds">${s.winds} winds</div>
            <p>${s.note}</p>
        </div>`).join("");
}

export default {
    id: "learn",
    label: "Learn",
    icon: "fa-graduation-cap",

    render() {
        return (
            sectionHead("fa-graduation-cap", "Learn",
                "How tropical systems form, what the categories mean, and how to prepare.") +
            `<div class="edu-grid">
                <article class="edu-card">
                    <h2><i class="fas fa-wind" aria-hidden="true"></i> Hurricane Formation</h2>
                    <p>Hurricanes form over warm ocean waters (at least 80°F) when atmospheric conditions are favorable. The process requires low wind shear, sufficient atmospheric instability, and the Coriolis effect to create rotation.</p>
                    <p>Tropical systems progress through distinct stages: tropical wave, to tropical depression, to tropical storm, to hurricane. Each stage is defined by sustained wind speeds and organizational structure.</p>
                </article>

                <article class="edu-card">
                    <h2><i class="fas fa-water" aria-hidden="true"></i> Storm Surge</h2>
                    <p>Storm surge is often the deadliest aspect of hurricanes. It is caused by winds pushing ocean water toward shore, creating a wall of water that can reach 20+ feet above normal sea level.</p>
                    <p>The surge is influenced by storm intensity, size, forward speed, track angle, and coastal geography. Shallow coastal areas and concave coastlines amplify surge heights.</p>
                </article>
            </div>

            <article class="edu-card edu-wide">
                <h2><i class="fas fa-gauge-high" aria-hidden="true"></i> Saffir-Simpson Hurricane Scale</h2>
                <div class="scale-grid">${scaleHtml()}</div>
            </article>

            <article class="edu-card edu-wide">
                <h2><i class="fas fa-shield-halved" aria-hidden="true"></i> Preparation Guidelines</h2>
                <p class="edu-rule"><strong>Run from the water, hide from the wind.</strong></p>
                <p>Storm surge evacuation is mandatory when ordered. Flooding from surge can occur miles inland and is the primary killer in hurricanes. Wind damage, while dangerous, is generally survivable in a well-built structure.</p>
                <ul class="edu-list">
                    <li>Have an evacuation plan and multiple routes.</li>
                    <li>Maintain emergency supplies for 7+ days.</li>
                    <li>Know your evacuation zone.</li>
                    <li>Keep important documents in waterproof containers.</li>
                    <li>Install storm shutters or board up windows.</li>
                </ul>
                <p class="edu-foot">For official forecasts, watches, warnings, and evacuation orders, always follow the
                    <a href="https://www.nhc.noaa.gov/" target="_blank" rel="noopener">National Hurricane Center</a>
                    and your local emergency management. More tools are in the <a href="#resources">Resource Hub</a>.</p>
            </article>`
        );
    },
};
