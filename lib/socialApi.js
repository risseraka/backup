/**
 * Social APIs
 */

module.exports = function (config) {

  var SocialApi = {};

  /**
   * Facebook API
   */

  SocialApi['facebook'] = require('fbgraph');

  /**
   * Twitter API
   */

  var Twit = require('twit');
  SocialApi['twitter'] = new Twit({
    consumer_key: config.twitter.consumerKey,
    consumer_secret: config.twitter.consumerSecret,
    access_token: ' ',
    access_token_secret: ' '
  });

  /**
   * Google API
   */

  var googleapis = require('googleapis');
  var OAuth2 = googleapis.auth.OAuth2Client;
  var oauth2Client = new OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.callbackURL
  );

  googleapis
    .discover('plus', 'v1')
    .execute(function(err, client) {
      client.plus.withAuthClient(oauth2Client);

      SocialApi['google'] = client.plus;
    });

  return SocialApi;
};
