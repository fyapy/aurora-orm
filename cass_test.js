const { Client } = require('cassandra-driver')

const client = new Client({
  keyspace: 'dating_project',
  contactPoints: ['127.0.0.1'],
  localDataCenter: 'datacenter1',
})

client.connect()
  .then(async () => {
    console.log('connected')

    const res = await client.execute('CREATE TABLE lol (id timeuuid PRIMARY KEY, textColumn text)')
    console.log(res)
  })
  .catch(err => {
    console.log('err', err)
  })

// let authProvider = new cassandra.auth.PlainTextAuthProvider('Username', 'Password');
// // Replace the PublicIPs with the IP addresses of your clusters
// let contactPoints = ['PublicIP1','PublicIP2','PublicIP3'];
// // Replace DataCenter with the name of your data center, for example: 'AWS_VPC_US_EAST_1'
// let localDataCenter = 'DataCenter';

// let client = new cassandra.Client({contactPoints: contactPoints, authProvider: authProvider, localDataCenter: localDataCenter, keyspace:'grocery'});
