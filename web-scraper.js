var Future = Npm.require('fibers/future');

// https://gist.github.com/Loupax/7a758b116dea5d6355bc
var getAssetPath = function getAssetPath(packageName, assetPath) {
    assetPath = assetPath || '';
    var meteor_root = Npm.require('fs').realpathSync(process.cwd() + '/../');

    var assets_folder = meteor_root + '/server/assets/packages/'+packageName.replace(':','_')+'/'+assetPath;
    return assets_folder;
};

var ScrapedWebpage = function ScrapedWebpage(url){
    this.init(url);
};
ScrapedWebpage.prototype._html;
ScrapedWebpage.prototype._url;
ScrapedWebpage.prototype._document;
ScrapedWebpage.prototype.fetch= function(){
    var html = this._html;
    return html;
};
ScrapedWebpage.prototype.init = function(url){
    var fut = new Future();
    var spawn = Npm.require('child_process').spawn;

    var phantom = spawn('phantomjs', [getAssetPath('loupax:web-scraper','assets/phantom_driver.js'), url]);
    var dataBucket = [];
    var errBucket  = [];
    phantom.stdout.on('data', Meteor.bindEnvironment(function (data) {
        dataBucket.push(data.toString());
    }));
    phantom.stderr.on('data', Meteor.bindEnvironment(function (data) {
        errBucket.push(data.toString());
    }));
    phantom.on('exit', Meteor.bindEnvironment(function (code) {
        if (errBucket.length) {
            fut.throw(new Meteor.Error(500, 'Error while running phantomjs' + errBucket.join()));
        } else {
            var doc = dataBucket.join('');
            fut.return(doc.substr(0, doc.indexOf('</html>') + 8));
        }
    }));

    this._html = fut.wait();
    this._url = url;
    this._document = cheerio.load(this._html);
    return this;
};
ScrapedWebpage.prototype.title = function(){ return this._document('title').text();};
ScrapedWebpage.prototype.getMeta = function(options){
    options = _.extend({
        fixRelativePaths: false,
        removeDuplicates: false,
        filterSelector: '*',
        prunePrefixes: []
    }, options);

    var duplicates = [];
    var $ = this._document;
    var metaData = [];
    $('meta').filter(options.filterSelector).each(function (index, meta) {
        var attrs = meta.attribs;
        if (attrs.property) {
            var segments = attrs.property.split(':');
            var prefix = segments.shift();
            if (options.prunePrefixes.indexOf(prefix) > -1) {
                attrs.property = segments.join(':');
            }
        }
        // We store the string representations to an array
        // to make sure we don't add the same property set multiple times
        var json = JSON.stringify(attrs);
        if (duplicates.indexOf(json) === -1) {
            duplicates.push(json);
            metaData.push(attrs);
        }
    });
    if(options.fixRelativePaths){
        var domain = this._url.split('/').slice(0,3).join('/')
        metaData.forEach(function(meta){
            if (!!meta.property && meta.content && meta.property.split(':').indexOf('image') > -1) {
                if (meta.content.indexOf('http') !== 0) {
                    if(meta.content.indexOf('/')[0] === 0) {
                        meta.content = domain + meta.content;
                    } else {
                        meta.content = domain + '/' + meta.content;
                    }
                }
            }
        });
    }
    return metaData;
};

Scraper = {
    create: function ScraperCreate(url){
        return new ScrapedWebpage(url);
    },
    /**
     * Goes through the provided options.meta array, and
     * downloads any image-related content from them, and
     * updates the the options.meta record so it now points
     * to the downloaded file instead
     *
     * @param options
     * @constructor
     */
    downloadMetadataImages: function ScraperDownloadMetadataImages(options){
        options = _.extend({
            /* Add defaults here */
            imageUrl: '/'
        }, options);

        var futures = [];
        var fs = Npm.require('fs');
        options.meta.forEach(function (meta, index, coll) {
            if (meta.property && meta.property === 'image') {

                if (!URLUtils.isImage(meta.content)) {
                    return;
                }
                var _id = options.imageCollection.insert({
                    'originalFilename': meta.content,
                    'mimeType': null
                });
                var filename = [_id, meta.content.split('.').pop()].join('.');
                var path = options.imageLocation + filename;
                var file = fs.createWriteStream(path);

                try {
                    var future = new Future();
                    futures.push(future);
                    (meta.content.indexOf('http:') === 0 ? Npm.require('http') : Npm.require('https')).get(meta.content, function (response) {
                        response.pipe(file);
                        response.on('close', function () {
                            future.reject();
                        });
                        response.on('end', function () {
                            future.return();
                        })
                    });
                    // Make sure the path and the filename are separated by a /
                    if(options.imageUrl[options.imageUrl.length - 1] === '/'){
                        meta.content = options.imageUrl + filename;
                    }else{
                        meta.content = options.imageUrl +'/'+ filename;
                    }

                } catch (e) {}
            }
        });

        futures.map(function (future) {
            return future.wait();
        });
    }
};