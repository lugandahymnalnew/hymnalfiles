const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://kitaroghope:kitasrog@cluster0.9uort.mongodb.net/?retryWrites=true&w=majority';
async function main() {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db('newHymnal');
  const users = db.collection('users');

  const user = await users.findOne({ userName: 'admin2' });
  if (user) {
    console.log('Found user:', user.userName, '| status:', user.status, '| role:', user.role);
    await users.updateOne(
      { _id: user._id },
      { $set: { status: 'approved', role: 'admin' } }
    );
    console.log('Promoted to admin and approved!');
  } else {
    console.log('User admin2 not found');
    const all = await users.find({}).limit(10).toArray();
    console.log('Existing users:', JSON.stringify(all.map(u => ({ name: u.userName, email: u.email, status: u.status, role: u.role }))));
  }
  await client.close();
}
main().catch(console.error);
