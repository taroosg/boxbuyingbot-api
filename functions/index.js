const functions = require('firebase-functions');

const express = require("express");
const cors = require('cors');

require('dotenv').config();

const admin = require('./model/firebase');
const db = admin.firestore();

const app = express();
app.use(cors());

// serve
// http://localhost:5000/boxbuyingbot/us-central1/api

const Twitter = require('twitter');
const client = new Twitter({
  consumer_key: process.env.TWITTER_API_KEY,
  consumer_secret: process.env.TWITTER_API_SECRET_KEY,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

// tweet関数
const tweetPost = async urls => {
  const urlIndex = ~~(Math.random() * urls.length);
  console.log(urlIndex);
  const content = `おやつにお菓子をどうぞ🍩\n${urls[urlIndex]}`;
  // const content = `おやつにお菓子をどうぞ🍩\nhttps://amzn.to/2YsoGan`;
  try {
    const tweet = await client.post('statuses/update', { status: content });
    return;
  } catch (e) {
    console.error(e);
    tweetPost(urls)
  }
}

// get all items and tweet
app.get('/posttweet', async (req, res, next) => {
  try {
    const itemSnapshot = await db.collection('items')
      .where('404', '==', false)
      .get();
    const items = itemSnapshot.docs.map(x => {
      return {
        id: x.id,
        data: x.data()
      };
    })
    const urls = items.map(x => x.data.url);
    console.log(urls)
    tweetPost(urls);
    res.send([{
      code: 200, message: 'The tweet was sent.'
    }]);
  } catch (e) {
    next(e);
  }
});

// get all items
app.get('/', async (req, res, next) => {
  try {
    const itemSnapshot = await db.collection('items')
      .orderBy('updated_at', 'desc')
      .get();
    const items = itemSnapshot.docs.map(x => {
      return {
        id: x.id,
        data: x.data()
      };
    })
    res.json(items);
  } catch (e) {
    next(e);
  }
});


// add new item
app.post('/', async (req, res, next) => {
  try {
    const data = req.body;
    if (!data) {
      throw new Error('Data is blank');
    }
    const postData = {
      ...data,
      404: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }
    const ref = await db.collection('items').add(postData);
    res.json({
      id: ref.id,
      data: postData,
    });
  } catch (e) {
    next(e);
  }
});

// update item
app.put('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    const newData = req.body;
    if (!id) {
      throw new Error('id is blank');
    }
    if (!newData) {
      throw new Error('data is blank');
    }
    const ref = await db
      .collection('items')
      .doc(id)
      .update({
        ...newData,
        ...{ updated_at: admin.firestore.FieldValue.serverTimestamp() },
      })
    const newItem = await db
      .collection('latlng')
      .doc(id)
      .get();
    if (!newItem.exists) {
      throw new Error('item does not exists');
    }
    res.json({
      id: newItem.id,
      data: newItem.data()
    });
  } catch (e) {
    next(e);
  }
});

// delete item
app.delete('/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!id) {
      throw new Error('id is blank');
    }
    await db
      .collection('items')
      .doc(id)
      .delete();
    res.json({
      id
    });
  } catch (e) {
    next(e);
  }
});

// 出力
const api = functions.https.onRequest(app);
module.exports = { api };