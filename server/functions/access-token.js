exports.handler = function (context, event, callback) {
    const twilio = require('twilio');
    const response = new Twilio.Response()

    const API_KEY = context.SECRET_API_KEY;  // Store this in Twilio environment variables
    const clientApiKey = event.api_key;  // Sent from the app

    // Simple API key validation
    if (clientApiKey !== API_KEY) {
        response.setStatusCode(403);
        response.setBody('Unauthorized request: Invalid API key');
        return callback(null, response);
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    try {
        // Fetch environment variables from the context
        const { ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_APP_SID } = context;

        // Ensure all required environment variables are present
        if (!ACCOUNT_SID) throw new Error('Missing ACCOUNT_SID');
        if (!TWILIO_API_KEY) throw new Error('Missing TWILIO_API_KEY');
        if (!TWILIO_API_SECRET) throw new Error('Missing TWILIO_API_SECRET');
        if (!TWILIO_APP_SID) throw new Error('Missing TWILIO_APP_SID');

        // Get the user identity from the query parameters or default to 'unknown_user'
        const identity = event.user || 'unknown_user';

        // Create a VoiceGrant
        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: TWILIO_APP_SID,
            incomingAllow: false,
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
        const response = new Response();
        response.appendHeader('Content-Type', 'application/json');
        response.setBody({ token: token.toJwt(), identity });

        return callback(null, response);
    } catch (error) {
        console.error('Error generating token:', error.message);

        // Handle errors and return a 500 status code
        const response = new Response();
        response.setStatusCode(500);
        response.setBody(`Error generating token: ${error.message}`);

        return callback(null, response);
    }
};
