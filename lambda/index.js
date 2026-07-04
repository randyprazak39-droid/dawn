const https = require('https');

const PHP_ENDPOINT = 'https://www.dawnofnight.com/alexa/alexa_endpoint.php';

function proxyToPHP(event) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(event);
        const url = new URL(PHP_ENDPOINT);

        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (e) {
                    reject(new Error('Invalid JSON from PHP: ' + data.substring(0, 200)));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('PHP endpoint timeout'));
        });

        req.write(postData);
        req.end();
    });
}

exports.handler = async (event) => {
    console.log('Alexa Request:', JSON.stringify(event, null, 2));

    try {
        const response = await proxyToPHP(event);
        console.log('PHP Response:', JSON.stringify(response, null, 2));
        return response;
    } catch (err) {
        console.error('Proxy Error:', err.message);

        return {
            version: '1.0',
            response: {
                outputSpeech: {
                    type: 'SSML',
                    ssml: '<speak>Sorry, I could not connect to Dawn of Night right now. Please try again later.</speak>'
                },
                shouldEndSession: true
            }
        };
    }
};
