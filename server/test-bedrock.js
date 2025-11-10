#!/usr/bin/env node

// Quick test script to verify Bedrock configuration
// Run with: node test-bedrock.js

require('dotenv').config();
const axios = require('axios');

async function testBedrock() {
    console.log('🧪 Testing Bedrock Configuration...\n');
    
    // Check environment variables
    console.log('📋 Environment Check:');
    console.log(`   BEDROCK_API_KEY: ${process.env.BEDROCK_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`   AWS_REGION: ${process.env.AWS_REGION ? `✅ ${process.env.AWS_REGION}` : '❌ Not set'}`);
    
    if (!process.env.BEDROCK_API_KEY || !process.env.AWS_REGION) {
        console.log('\n❌ Please set BEDROCK_API_KEY and AWS_REGION in your .env file');
        return;
    }
    
    // Test API call
    console.log('\n🔄 Testing API Connection...');
    
    try {
        const apiKey = process.env.BEDROCK_API_KEY;
        const awsRegion = process.env.AWS_REGION;
        const modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0";
        const url = `https://bedrock-runtime.${awsRegion}.amazonaws.com/model/${modelId}/invoke`;

        const payload = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 100,
            messages: [
                {
                    "role": "user", 
                    "content": "You are a League of Legends AI assistant. Respond with a brief hello and mention you're ready to analyze gameplay data."
                }
            ],
        };

        const response = await axios.post(url, payload, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 15000
        });

        console.log('✅ Connection successful!');
        console.log(`📝 Test Response: "${response.data.content[0].text}"\n`);
        console.log('🎉 Your Bedrock integration is ready to use!');
        console.log('💡 Start your server and try the chat feature in your League app.');
        
    } catch (error) {
        console.log('❌ Connection failed:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        console.log('\n💡 Troubleshooting:');
        console.log('   - Check your API key is valid and not expired');
        console.log('   - Verify the AWS region is correct');
        console.log('   - Ensure you have permissions for Bedrock API access');
    }
}

testBedrock().catch(console.error);
