/**
 * Reasoning slider plugin, node half.
 *
 * Pure UI plugin: the empty apply exists so the plugin appears as an entry in
 * the host `cordis.yml` / Loader tree. The browser half ships through
 * `exports["./client"]`, discovered from the package.json `dsh.client`
 * declaration, and the host serves it under `/plugins`.
 */

/** Host plugin body — no host-side behaviour for this surface plugin. */
function apply() {}

export { apply };
