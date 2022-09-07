import AWS from 'aws-sdk';
import commonMiddleware from '../middlewares/commonMiddleware';
import createError from 'http-errors';
import validator from '@middy/validator';
import placeBidSchema from '../schemas/placeBidSchema';
import { getAuctionById } from './getAuction';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
    const { id } = event.pathParameters;
    const { amount } = event.body;

    const auction = await getAuctionById(id);

    if(auction.status !== 'OPEN') {
        throw new createError.Forbidden('You cannot bid on closed auctions!');
    }

    if (amount <= auction.highestBid.amount && auction.highestBid.amount !== 0) {
        throw new createError.Forbidden(`Your bid must be higher than ${auction.highestBid.amount}`);
    }

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'set highestBid.amount = :amount',
        ExpressionAttributeValues: {
            ':amount': amount
        },
        ReturnValues: 'ALL_NEW'
    };

    let updatedAcution;

    try {
        const result = await dynamodb.update(params).promise();

        updatedAcution = result.Attributes
    } catch(error) {
        console.log(error);
        throw new createError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(updatedAcution),
    };
}

export const handler = commonMiddleware(placeBid)
    .use(validator({ inputSchema: placeBidSchema }));

