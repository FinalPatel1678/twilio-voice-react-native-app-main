exports.handler = async function (context, event, callback) {
    const twilio = require('twilio');
    const response = new Twilio.Response();

    const API_KEY = context.SECRET_API_KEY;  // Store this in Twilio environment variables
    const clientApiKey = event.api_key;  // Sent from the app

    // Simple API key validation
    if (clientApiKey !== API_KEY) {
        response.setStatusCode(403);
        response.setBody('Unauthorized request: Invalid API key');
        return callback(null, response);
    }

    const client = twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);

    try {
        const phoneNumbers = await client.incomingPhoneNumbers.list({ status: 'active' });

        response.appendHeader('Content-Type', 'application/json');
        response.setBody({ phoneNumbers });

        return callback(null, response);
    } catch (error) {
        console.error('Error fetching phone numbers:', error.message);

        response.setStatusCode(500);
        response.appendHeader('Content-Type', 'text/plain');
        response.setBody(`Error fetching phone numbers: ${error.message}`);

        return callback(null, response);
    }
};
