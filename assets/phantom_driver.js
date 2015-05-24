/**
 * Created by loupax on 4/25/15.
 */
var page = require('webpage').create();
var args = require('system').args;
var URL = args[1];
console.log(URL, args);
var noop = function(){};
page.onConsoleMessage = noop;
page.onWarning        = noop;
page.onError          = noop;
page.onAlert          = noop;
page.onConfirm        = noop;

page.onInitialized = function() {
    page.onCallback = function(data) {
        console.log(page.content);
        phantom.exit();
    };

    page.evaluate(function() {
        document.addEventListener('DOMContentLoaded', function() {
            window.callPhantom();
        }, false);
    });

};

page.open(URL, function(status) {
    if(status !== 200){phantom.exit();}
});