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
    const { email } = event.requestContext.authorizer;

    const auction = await getAuctionById(id);

    // Bid identity validation
    if (email === auction.seller) {
        throw new createError.Forbidden('You cannot bid on your own auctions!');
    }

    // Avoid double bidding
    if (email == auction.highestBid.bidder) {
        throw new createError.Forbidden('You are already the highest bidder!');
    }

    // Auction status validation
    if (auction.status !== 'OPEN') {
        throw new createError.Forbidden('You cannot bid on closed auctions!');
    }

    // Auction amount validation
    if (amount <= auction.highestBid.amount && auction.highestBid.amount !== 0) {
        throw new createError.Forbidden(`Your bid must be higher than ${auction.highestBid.amount}`);
    }

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression: 'set highestBid.amount = :amount, highestBid.bidder = :bidder',
        ExpressionAttributeValues: {
            ':amount': amount,
            ':bidder': email
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


