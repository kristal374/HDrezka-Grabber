import { useCurrentTab } from "../providers/CurrentTabProvider";
import { DefaultPage } from "./DefaultPage";

export function Router() {
    const { currentTab } = useCurrentTab();
    if (!currentTab.id || !currentTab.isHdrezka) {
        return <DefaultPage />;
    }
    return <h2 className="title">{currentTab.id}</h2>;
}
