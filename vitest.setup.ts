// Los tests no salen a internet: un fetch sin simular falla al instante
// (los que lo necesitan lo reemplazan con vi.stubGlobal("fetch", ...)).
globalThis.fetch = () => Promise.reject(new Error("Sin red en los tests: simulá fetch"));
