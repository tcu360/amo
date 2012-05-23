/*
Copyright (c) 2012 Cole Gillespie

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

// To get started you will need to:
//
// git clone
// cd amo
// npm install
// node app.js ( you may need to change the port to something other than 80 if you get EACCESS error)
//

var request = require('request'), 
    http = require('http'),
    simplexml = require('xml-simple'),
    uuid = require('node-uuid'),
    jsdom  = require('jsdom'),
    crypto = require('crypto'),
    request = require('request'),
    url  = require('url'),
    http = require('http');


http.createServer(function (req, res) {

  res.writeHead(200, {'Content-Type': 'application/json'});

  var url_parts = url.parse(req.url, true),
      query = url_parts.query,
      getFacebookShares,
      getTwitterShares,
      getGooglePlusOnes,
      shareObj,
      init;

  if(query.q){

    getFacebookShares = function(url, shareObj){

      request('http://api.facebook.com/restserver.php?method=links.getStats&urls=' +url, function (err, r, body){
        simplexml.parse(body, function(e, parsed) {
          if(parsed !== undefined){
            var fbShares = {
              shares : Number(parsed.link_stat.share_count),
              likes : Number(parsed.link_stat.like_count)
            };
            shareObj.facebook = fbShares;
            console.log(JSON.stringify(shareObj));
            res.end(JSON.stringify(shareObj));
          }
        }); // end simplexml.parse
      });

    };

    getTwitterShares = function(url, shareObj){

      request('http://urls.api.twitter.com/1/urls/count.json?url='+url, function (err, res, body){
        if(!err && res.statusCode === 200){
          var tweet = JSON.parse(body),
              tweetCount = {
                count: tweet.count
              };
          shareObj.twitter = tweetCount;
          getFacebookShares(url, shareObj);
        }
      });

    }; // end getTwitterShares()

    getGooglePlusOnes = function(url, shareObj){

      var gPlusOneId = function () {
            return ["I1_", (new Date()).getTime()].join("");
          },
          gPlusOneRpc = function(){
            var prePreRpc = crypto.randomBytes(32).readUInt32BE(0),
                preRpc = Number("0." + prePreRpc),
                rpc = Math.round(1E9 * (0, preRpc));
            return rpc
          },
          gPlusOneUrl = function(){
            var uri = '';
                uri += "https://plusone.google.com/_/+1/fastbutton?";
                uri += "url=" + url;
                uri += "&size=standard";
                uri += "&hl=en-US";
                uri += "sh=m;/_/apps-static/_/js/gapi/__features__/rt=j/ver=zVTxVnVbJog.en_US./sv=1/am=!FRwcaGMpC1CIJ0aI4g/d=1/#id=" + gPlusOneId();
                uri += "&parent=true";
                uri += "&rpctoken=" + gPlusOneRpc();
                uri += "&_methods=onPlusOne,_ready,_close,_open,_resizeMe,_renderstart";
            return uri;
          },
          plusOneCount = {
            ccount: undefined
          };

      jsdom.env({
        html: gPlusOneUrl(),
        scripts: [
          'http://code.jquery.com/jquery-1.7.min.js'
        ],
        done: function(errors, window) {

          var $ = window.$;
          var count = $('#aggregateCount').text();
          plusOneCount.count = Number(count);
          shareObj.googlePlus = plusOneCount;
          getTwitterShares(url, shareObj);
        }
      });
    }; // end getGooglePlusOnes

    shareObj = {
      googlePlus: undefined,
      twitter: undefined,
      facebook: undefined
    };

    init = function(){
      getGooglePlusOnes(query.q, shareObj);
    };

    init();

  }else{
    res.end('ERROR! Your request contains no query. Please provide a query like so the following: http://amo.jit.su/?q=http://www.linkToQuery.com');
  }


}).listen(1337, '127.0.0.1');

console.log('Server started...');
