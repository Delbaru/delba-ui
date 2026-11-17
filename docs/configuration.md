# Executable project configuration

`delba-ui build|watch|check|test --config <file>` accepts a direct `UiConfig`
or a project composition whose `ui` property is that config. Without `--config`,
the CLI uses a local `ui.config.ts`, then searches ancestors for `delba.config.ts`.
An explicit missing file is an error.

All scan, theme, skin and rule paths use the application directory. It defaults
to the invoking cwd. Optional `UiConfig.root` resolves relative to the loaded
configuration file; it makes invocation from the project root and application
directory equivalent. A separate fixture config can set its own root.
The UI library's own CLI invocation uses its standalone defaults rather than an
ancestor application's composition.

`withUi(nextConfig, { config: '../delba.config.ts' })` forwards the same selection
to build and development watch. Omit the option to use the CLI discovery rules.

The Node-only `@delba/ui/config-loader` entry exports `resolveConfigFile` and
`loadProjectConfig({ cwd, config, profile })`. A loaded session exposes `project`,
selected `value`, application `root`, config `file`, imported `files`,
`importModule(relativePath)` and asynchronous `close()`. Import public projections
through that session before closing it to validate object identity, including
callback values. Close each session after use. A new session rereads authored
fragments; library package imports retain their ordinary package contract.
Standalone tooling may pass `config: null` to disable discovery while retaining
the TS runtime needed by its tools.

The loader owns TS loading, graph discovery and application path resolution.
It has no site/CMS dependency and does not validate their domain configuration.
Do not import it into browser code. Application adapters validate their own
public fragment provenance and expose browser-safe modules directly.
