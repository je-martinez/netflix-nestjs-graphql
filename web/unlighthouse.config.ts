import { defineConfig } from 'unlighthouse';

export default defineConfig({
  site: 'http://localhost:4321',
  scanner: {
    // Crawl all pages from root
    startingUrls: ['/'],
    exclude: ['/favicon*', '/_astro/*'],
    maxRoutes: 50,
    throttle: true,
  },
  lighthouseOptions: {
    // Run all Lighthouse categories
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  },
  ci: {
    // Fail CI if scores drop below these thresholds
    budget: {
      performance: 90,
      accessibility: 90,
      'best-practices': 90,
      seo: 90,
    },
  },
  reporter: 'json',
  outputPath: '.unlighthouse',
});
