import { defineConfig } from "vitepress"

export default defineConfig({
  title: "FixtureSmith",
  description: "Deterministic fixtures from your schemas",
  base: "/FixtureSmith/",
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ["meta", { name: "theme-color", content: "#07111f" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "FixtureSmith" }],
    [
      "meta",
      {
        property: "og:description",
        content: "Deterministic fixtures from your schemas",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content:
          "https://sykes10.github.io/FixtureSmith/fixturesmith-social-preview.png",
      },
    ],
  ],
  themeConfig: {
    siteTitle: "FixtureSmith",
    nav: [
      { text: "Guide", link: "/getting-started/" },
      { text: "Examples", link: "/guides/examples" },
      { text: "API", link: "/reference/api" },
      { text: "GitHub", link: "https://github.com/sykes10/FixtureSmith" },
    ],
    sidebar: [
      {
        text: "Learn",
        items: [
          { text: "Introduction", link: "/" },
          { text: "Getting started", link: "/getting-started/" },
          { text: "Determinism", link: "/determinism" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Runnable examples", link: "/guides/examples" },
          { text: "Overrides", link: "/guides/overrides" },
          { text: "Scenarios", link: "/guides/scenarios" },
          { text: "Testing with seeds", link: "/guides/testing" },
          { text: "Custom providers", link: "/providers" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API cheat sheet", link: "/reference/api" },
          { text: "Public API contract", link: "/public-api" },
          { text: "Schema support", link: "/schema-support" },
          { text: "Errors", link: "/errors" },
        ],
      },
      {
        text: "Project",
        items: [
          { text: "Architecture", link: "/architecture" },
          { text: "Contributing", link: "/contributing" },
          { text: "GitHub setup", link: "/github-setup" },
          { text: "Release readiness", link: "/release-readiness" },
        ],
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/sykes10/FixtureSmith" },
    ],
    search: { provider: "local" },
    footer: {
      message: "Released under the MIT License.",
      copyright: "FixtureSmith contributors",
    },
  },
})
