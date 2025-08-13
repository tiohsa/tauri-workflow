export async function saveProject(port, snapshot) {
    await port.save(snapshot);
}
export async function loadProject(port) {
    return port.load();
}
