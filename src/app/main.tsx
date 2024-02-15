import { createRoot } from "react-dom/client";
import { App } from "../components/App";
import { Router } from "../components/Router";

const element = document.querySelector("body")!;
const root = createRoot(element);
root.render(
    <App>
        <Router />
    </App>
);
