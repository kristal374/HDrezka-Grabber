import { CurrentTabProvider } from "../providers/CurrentTabProvider";

export function App({ children }: React.PropsWithChildren) {
    return (
        <CurrentTabProvider>
            <div className="container">{children}</div>
        </CurrentTabProvider>
    );
}
