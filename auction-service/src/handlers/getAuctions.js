import AWS from 'aws-sdk';
import commonMiddleware from '../middlewares/commonMiddleware';
import createError from 'http-errors';
import validator from '@middy/validator';
import getAuctionsSchema from '../schemas/getAuctionsSchema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
    let auctions;
    const { status } = event.queryStringParameters;

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        IndexName: 'statusAndEndDate',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributesValues: {
            ':status': status
        },
        ExpressionAttributesNames: {
            '#status': 'status'
        }
    };
    
    try {
        const result = await dynamodb.query(params).promise()

        auctions = result.Items;
    } catch(error) {
        console.log(error);
        throw new createError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(auctions),
    };
}

export const handler = commonMiddleware(getAuctions)
    .use(validator({ inputSchema: getAuctionsSchema, useDefaults: true }));


