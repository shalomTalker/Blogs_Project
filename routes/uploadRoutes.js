const AWS = require('aws-sdk');
const uuid = require('uuid/v1');
const { accessKeyId, secretAccessKey } = require('../config/keys');
const requireLogin = require('../middlewares/requireLogin')

const s3 = new AWS.S3({
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4',
    region: 'eu-central-1'
})

module.exports = app => {
    app.get('/api/upload', requireLogin, (req, res) => {

        const Key = `${req.user.id}/${uuid()}.jpeg`
        s3.getSignedUrl('putObject', {
            Bucket: 'blogs-bucket-shalom-dev',
            ContentType: 'jpeg',
            Key
        }, (err, url) => {
            res.send({ Key, url })
        })
    })
}