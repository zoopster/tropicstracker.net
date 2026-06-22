import { sectionHead, placeholder } from "../ui.js";

export default {
    id: "radar",
    label: "Radar",
    icon: "fa-broadcast-tower",
    render() {
        return (
            sectionHead("fa-broadcast-tower", "Local Radar",
                "Animated NEXRAD radar over your location.") +
            placeholder({
                icon: "fa-broadcast-tower",
                title: "Local radar is on the way",
                body: "Sprint 2 adds animated radar (RainViewer plus official Iowa Mesonet NEXRAD) with loop controls and geolocation to center on you.",
                sprint: "Sprint 2",
            })
        );
    },
};
