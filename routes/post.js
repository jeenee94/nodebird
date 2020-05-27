const express = require('express');
const multer = require('multer');
const path = require('path');

const { Post, Hashtag, User } = require('../models');
const { isLoggedIn } = require('./middlewares');
const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext);
    },
  }),
  limit: { fileSize: 5 * 1024 * 1024 },
});

router.post('/img', isLoggedIn, upload.single('img'), (req, res) => {
  console.log(req.file);
  res.json({ url: `/img/${req.file.filename}` });
});

const upload2 = multer();
router.post('/', isLoggedIn, upload2.none(), async (req, res, next) => {
  try {
    const new_content = req.body.content.replace(/#[^#\s,;]+/gm, '');
    const hashtags = req.body.content.match(/#[^#\s,;]+/gm);
    const post = await Post.create({
      content: new_content,
      img: req.body.url,
      userId: req.user.id,
    });
    if (hashtags) {
      const result = await Promise.all(
        hashtags.map((tag) =>
          Hashtag.findOrCreate({
            where: { title: tag.slice(1).toLowerCase() },
          })
        )
      );
      await post.addHashtags(result.map((r) => r[0]));
    }
    res.redirect('/');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/hashtag', async (req, res, next) => {
  const query = req.query.hashtag;
  if (!query) {
    return res.redirect('/');
  }
  try {
    const hashtag = await Hashtag.findOne({ where: { title: query } });
    let posts = [];
    if (hashtag) {
      posts = await hashtag.getPosts({
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
      });
    }
    return res.render('main', {
      title: `${query} | NodeBird`,
      user: req.user,
      twits: posts,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 게시물 삭제
router.delete('/:id', async (req, res, next) => {
  try {
    await Post.destroy({ where: { id: req.params.id, userId: req.user.id } });
    res.send('OK');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 좋아요
router.post('/:id/like', async (req, res, next) => {
  try {
    const post = await Post.findOne({ where: { id: req.params.id } });
    await Post.update({ cnt: post.dataValues.cnt + 1 }, { where: { id: req.params.id } });
    post.addLikers(req.user.id);
    res.send('OK');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

// 좋아요 취소
router.delete('/:id/like', async (req, res, next) => {
  try {
    const post = await Post.findOne({ where: { id: req.params.id } });
    await Post.update({ cnt: post.dataValues.cnt - 1 }, { where: { id: req.params.id } });
    post.removeLikers(req.user.id);
    res.send('OK');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;
