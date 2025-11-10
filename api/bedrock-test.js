// Vercel Serverless Function
const axios = require('axios');

module.exports = async (req, res) => {
    try {
        if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION) {
            return res.status(200).json({
                configured: false,
                message: 'Bedrock not configured. Set BEDROCK_API_KEY and AWS_REGION in environment variables.'
            });
        }

        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-sonnet-4-5-20250929-v1:0";
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 50,
            messages: [{ "role": "user", "content": "Say hello in one sentence." }],
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 10000
        });

        res.status(200).json({
            configured: true,
            message: 'Bedrock is working correctly!',
            testResponse: response.data.content[0].text,
            region: awsRegion
        });

    } catch (error) {
        console.error('Bedrock test error:', error);
        res.status(200).json({
            configured: false,
            message: 'Bedrock configuration error',
            error: error.response?.data?.message || error.message
        });
    }
};
