let registered;
/** Hooks are owned by Frontend generators; this does not load project configuration. */
export function registerFrontendSources() {
    return registered ??= Promise.all([import('tsx/esm/api'), import('tsx/cjs/api')]).then(([esm, cjs]) => {
        cjs.register();
        esm.register();
    });
}
