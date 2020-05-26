const express = require('express');
const { isLoggedIn, isNotLoggedIn } = require('./middlewares');
const { Post, User, Hashtag } = require('../models');

const router = express.Router();

// 프로필
router.get('/profile', isLoggedIn, (req, res) => {
  res.render('profile', { title: '내 정보 - NodeBird', user: req.user });
});

// 회원가입
router.get('/join', isNotLoggedIn, (req, res) => {
  res.render('join', {
    title: '회원가입 - NodeBird',
    user: req.user,
    joinError: req.flash('joinError'),
  });
});

// 메인
router.get('/', (req, res, next) => {
  Post.findAll({
    include: [
      {
        // 작성자
        model: User,
        attributes: ['id', 'nick'],
      },
      {
        // 좋아요를 누른 사람
        model: User,
        attributes: ['id', 'nick'],
        as: 'Likers',
      },
      {
        // 해시태그
        model: Hashtag,
        attributes: ['id', 'title'],
        as: 'Hashtags',
      },
    ],
  })
    .then((posts) => {
      res.render('main', {
        title: 'NodeBird',
        twits: posts,
        user: req.user,
        loginError: req.flash('loginError'),
      });
    })
    .catch((error) => {
      console.error(error);
      next(error);
    });
});

module.exports = router;
