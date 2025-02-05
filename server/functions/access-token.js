exports.handler = function (context, event, callback) {
    const twilio = require('twilio');

    const API_KEY = context.SECRET_API_KEY;  // Store this in Twilio environment variables
    const clientApiKey = event.api_key;  // Sent from the app

    // Simple API key validation
    if (clientApiKey !== API_KEY) {
        const response = new twilio.Response();
        response.setStatusCode(403);
        response.setBody('Unauthorized request');
        return callback(null, response);
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    try {
        // Fetch environment variables from the context
        const { ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_APP_SID } = context;

        // Get the user identity from the query parameters or default to 'unknown_user'
        const identity = event.user || 'unknown_user';

        // Create a VoiceGrant
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: TWILIO_APP_SID,
            incomingAllow: true,
        });

        // Create an access token
        const token = new AccessToken(
            ACCOUNT_SID,
            TWILIO_API_KEY,
            TWILIO_API_SECRET,
            { identity }
        );

        // Add the voice grant to the token
        token.addGrant(voiceGrant);

        // Return the token and identity in the response
        const response = new twilio.Response();
        response.appendHeader('Content-Type', 'application/json');
        response.setBody({ token: token.toJwt(), identity });

        return callback(null, response);
    } catch (error) {
        console.error('Error generating token:', error);

        // Handle errors and return a 500 status code
        const response = new twilio.Response();
        response.setStatusCode(500);
        response.setBody('Error generating token');

        return callback(null, response);
    }
};
