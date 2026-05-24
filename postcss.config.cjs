// Config vacio para cortar la herencia del postcss.config.cjs del
// monorepo padre (que requiere `autoprefixer` no instalado aqui).
// Vitepress no necesita plugins PostCSS adicionales en este portal.
module.exports = { plugins: [] };
