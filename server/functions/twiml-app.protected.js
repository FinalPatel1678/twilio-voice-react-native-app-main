exports.handler = function (context, event, callback) {
    const twilio = require('twilio');
    const VoiceResponse = twilio.twiml.VoiceResponse;

    try {
        // Extract 'To' number from the request body
        const { To, Caller_Id } = event;

        // Validate 'To' and 'Caller_Id'
        if (!To || !Caller_Id) {
            throw new Error('Missing required parameters: To and Caller_Id');
        }

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
        const response = new Twilio.Response();
        response.appendHeader('Content-Type', 'text/xml');
        response.setBody(twiml.toString());

        return callback(null, response);
    } catch (error) {
        console.error('Error generating TwiML:', error.message);

        // Handle errors and return a 500 status code
        const response = new twilio.Response();
        response.setStatusCode(500);
        response.appendHeader('Content-Type', 'text/plain');
        response.setBody(`Error generating TwiML: ${error.message}`);

        return callback(null, response);
    }
};
