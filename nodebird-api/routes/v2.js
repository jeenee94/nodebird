const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const url = require('url');

const { verifyToken, apiLimiter, premiumApiLimiter } = require('./middlewares');
const { Domain, User, Post, Hashtag } = require('../models');

const router = express.Router();

router.use(async (req, res, next) => {
  const domain = await Domain.findOne({
    where: { host: url.parse(req.get('origin')).host },
  });
  if (domain) {
    cors({ origin: req.get('origin') })(req, res, next);
  } else {
    next();
  }
});

router.use(async (req, res, next) => {
  const domain = await Domain.findOne({
    where: { host: url.parse(req.get('origin')).host },
  });
  if (domain.type === 'premium') {
    premiumApiLimiter(req, res, next);
  } else {
    apiLimiter(req, res, next);
  }
});

router.post('/token', async (req, res, next) => {
  const { clientSecret } = req.body;
  try {
    const domain = await Domain.findOne({
      where: { frontSecret: clientSecret },
      include: {
        model: User,
        attributes: ['nick', 'id'],
      },
    });
    if (!domain) {
      return res.status(401).json({
        code: 401,
        message: '등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요.',
      });
    }
    const token = jwt.sign(
      {
        id: domain.user.id,
        nick: domain.user.nick,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '5m',
        issuer: 'nodebird',
      }
    );
    return res.json({
      code: 200,
      message: '토큰이 발급되었습니다.',
      token,
    });
  } catch (error) {
    return res.status(500).json({
      code: 500,
      message: '서버 에러',
    });
  }
});

router.get('/test', verifyToken, (req, res) => {
  res.json(req.decoded);
});

router.get('/posts/my', verifyToken, (req, res) => {
  Post.findAll({ where: { userId: req.decoded.id } })
    .then((posts) => {
      console.log(posts);
      res.json({
        code: 200,
        payload: posts,
      });
    })
    .catch((error) => {
      console.error(error);
      return res.status(500).json({
        code: 500,
        message: '서버 에러',
      });
    });
});

router.get('/posts/hashtag/:title', verifyToken, async (req, res) => {
  try {
    const hashtag = await Hashtag.findOne({ where: { title: req.params.title } });
    if (!hashtag) {
      return res.json({
        code: 404,
        message: '검색 결과가 없습니다.',
      });
    }
    const posts = await hashtag.getPosts();
    return res.json({
      code: 200,
      payload: posts,
    });
  } catch (error) {
    console.error(error);
    return res.json({
      code: 500,
      message: '서버 에러',
    });
  }
});

router.get('/follow', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ where: req.decoded.id });
    const follower = await user.getFollowers({ attributes: ['id', 'nick'] });
    const following = await user.getFollowings({ attributes: ['id', 'nick'] });
    return res.json({
      code: 200,
      follower,
      following,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      code: 500,
      message: '서버 에러',
    });
  }
});

module.exports = router;
