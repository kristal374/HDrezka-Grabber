export function DefaultPage() {
    return (
        <h2 className="title">
            {browser.i18n.getMessage("default_description")}
        </h2>
    );
}
