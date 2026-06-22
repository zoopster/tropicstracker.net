import { sectionHead, placeholder } from "../ui.js";

export default {
    id: "satellite",
    label: "Satellite",
    icon: "fa-satellite",
    render() {
        return (
            sectionHead("fa-satellite", "GOES Satellite",
                "Geostationary satellite imagery for the tropics.") +
            placeholder({
                icon: "fa-satellite",
                title: "Satellite viewer coming soon",
                body: "Sprint 3 embeds the RAMMB SLIDER viewer and NESDIS GOES imagery with quick picks for GeoColor, infrared, and water vapor.",
                sprint: "Sprint 3",
            })
        );
    },
};
