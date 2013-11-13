var request = require('request'), 
    http = require('http'),
    simplexml = require('xml-simple'),
    uuid = require('node-uuid'),
    cheerio = require('cheerio'),
    crypto = require('crypto'),
    request = require('request'),
    url  = require('url'),
    http = require('http'),
    fs = require('fs');

var port = process.env.PORT || 1337;

var whitelist = process.env.whitelist || '';

http.createServer(function (req, res) {

  var url_parts = url.parse(req.url, true),
      query = url_parts.query,
      getFacebookShares,
      getTwitterShares,
      getLinkedInShares,
      getGooglePlusOnes,
      shareObj,
      init;
  
  if(query.q){

    var host = url.parse(query.q).hostname;

    if(!whitelist || whitelist == host) {

      res.writeHead(200, {'Content-Type': 'application/json'});

      getFacebookShares = function(url, shareObj){

        request('http://api.facebook.com/restserver.php?method=links.getStats&urls=' +url, function (err, r, body){
          simplexml.parse(body, function(e, parsed) {
            if(parsed !== undefined){
              var fbShares = {
                shares : Number(parsed.link_stat.share_count),
                likes : Number(parsed.link_stat.like_count),
                comments : Number(parsed.link_stat.comment_count)
              };
              shareObj.facebook = fbShares;
              console.log('Facebook Shares', fbShares)
              shareObj.total = shareObj.googlePlus.count + shareObj.linkedin.count + shareObj.twitter.count + shareObj.facebook.shares + shareObj.facebook.comments + shareObj.facebook.likes;
              res.end(JSON.stringify(shareObj));
            }
          }); // end simplexml.parse
        });

      };

      getTwitterShares = function(url, shareObj){
        request('http://urls.api.twitter.com/1/urls/count.json?url='+url, function (err, res, body){
          if(!err && res.statusCode === 200){
            if(body === 'twttr.receiveCount({"errors":[{"code":48,"message":"Unable to access URL counting services"}]})'){
              getTwitterShares(url, shareObj)
              return
            }

            console.log('Twitter shares', body);
            var tweet = JSON.parse(body),
                tweetCount = {
                  count: tweet.count
                };
            
            shareObj.twitter = tweetCount;
            getFacebookShares(url, shareObj);
          }
        });

      }; // end getTwitterShares()

      getLinkedInShares = function(url, shareObj){
        request('http://www.linkedin.com/countserv/count/share?format=json&url='+url, function (err, res, body){
          console.log(res);
          if(!err && res.statusCode === 200){
            console.log('LinkedIn shares', body);
            var linkedinCount = {
                  count: JSON.parse(body).count
                };
            
            shareObj.linkedin = linkedinCount;
            getTwitterShares(url, shareObj);
          }
        });      
      }

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
        request(gPlusOneUrl(), function (error, response, html) {
          if (!error && response.statusCode == 200) {
            $ = cheerio.load(html);
            var count = $('#aggregateCount').text();
            plusOneCount.count = Number(count);
            shareObj.googlePlus = plusOneCount;
            getLinkedInShares(url, shareObj);
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
      res.writeHead(400, {'Content-Type': 'application/json'});
      res.end('ERROR! You requested statistics for an unsupported hostname.');  
    }

  }else{
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end('ERROR! Your request contains no query. Please provide a query like so the following: http://amo.jit.su/?q=http://www.linkToQuery.com');
  }


}).listen(port, '0.0.0.0');

console.log('Server started...');
