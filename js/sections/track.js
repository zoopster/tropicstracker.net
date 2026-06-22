import { sectionHead, placeholder } from "../ui.js";

export default {
    id: "track",
    label: "Track",
    icon: "fa-map-marked-alt",
    render() {
        return (
            sectionHead("fa-map-marked-alt", "Live Storm Tracking",
                "Active tropical systems, forecast tracks, and the cone of uncertainty.") +
            placeholder({
                icon: "fa-satellite",
                title: "Interactive storm map is next up",
                body: "Sprint 1 wires this to live NHC data: active storm positions, forecast tracks, and cones on an interactive map, with NWS alerts layered in.",
                sprint: "Sprint 1",
            })
        );
    },
};
