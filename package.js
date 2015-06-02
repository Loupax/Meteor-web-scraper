Package.describe({
    name: 'loupax:web-scraper',
    version: '0.0.2',
    // Brief, one-line summary of the package.
    summary: 'Package that gives you access to web scraping functionality',
    // URL to the Git repository containing the source code for this package.
    git: 'https://github.com/Loupax/Meteor-web-scraper',
    // By default, Meteor will default to using README.md for documentation.
    // To avoid submitting documentation, set this field to null.
    documentation: 'README.md'
});

Package.onUse(function (api) {
    api.versionsFrom('1.1.0.2');
    api.addFiles('web-scraper.js', ['server']);
    api.export('Scraper', ['server']);
    api.use(['mrt:cheerio@0.3.2', 'loupax:url-utils@0.0.1']);
    api.addFiles('assets/phantom_driver.js', "server", {isAsset: true});
});

Package.onTest(function (api) {
    api.use('tinytest');
    api.use('loupax:web-scraper');
    api.addFiles('web-scraper-tests.js');
});
