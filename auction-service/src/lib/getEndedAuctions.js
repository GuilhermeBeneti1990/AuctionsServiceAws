import AWS from 'aws-sdk';

const dybamodb = new AWS.DynamoDB.DocumentClient();

export async function getEndedAuctions() {
    const now = new Date();
    
    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        IndexName: 'statusAndEndDate',
        KeyConditionExpression: '#status = :status AND endintAt <= :now',
        ExpressionAttributeValues: {
            ':status': 'OPEN',
            ':now': now.toISOString()
        },
        ExpressionAttributeNames: {
            '#status': 'status'
        }
    };

    const result = await dybamodb.query(params).promise();

    return result.Items;
}