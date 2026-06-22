import { sectionHead, placeholder } from "../ui.js";

export default {
    id: "learn",
    label: "Learn",
    icon: "fa-graduation-cap",
    render() {
        return (
            sectionHead("fa-graduation-cap", "Learn",
                "How tropical systems form, the Saffir-Simpson scale, and how to prepare.") +
            placeholder({
                icon: "fa-book-open",
                title: "Educational content is planned",
                body: "Sprint 5 ports the hurricane formation, Saffir-Simpson scale, storm surge, and preparation content into this section.",
                sprint: "Sprint 5",
            })
        );
    },
};
