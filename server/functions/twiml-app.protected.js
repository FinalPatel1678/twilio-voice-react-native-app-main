exports.handler = function (context, event, callback) {
    const twilio = require('twilio');
    const VoiceResponse = twilio.twiml.VoiceResponse;

    try {
        // Extract 'To' number from the request body
        const { To, Caller_Id } = event;

        // Initialize TwiML VoiceResponse
        const twiml = new VoiceResponse();

        // Create a <Dial> element
        const dial = twiml.dial({
            callerId: Caller_Id,
            answerOnBridge: true,
        });

        // Add <Number> with callbacks and machine detection
        dial.number(To);

        // Prepare the response
        const response = new twilio.Response();
        response.appendHeader('Content-Type', 'text/xml');
        response.setBody(twiml.toString());

        return callback(null, response);
    } catch (error) {
        console.error('Error generating TwiML:', error);

        // Handle errors and return a 500 status code
        const response = new twilio.Response();
        response.setStatusCode(500);
        response.setBody('Error generating TwiML');

        return callback(null, response);
    }
};
