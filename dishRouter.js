const express = require('express');
const bodyParser = require('body-parser');

const Dishes = require('../models/dishes');
var authenticate = require('../authenticate');

const dishRouter = express.Router();

dishRouter.use(bodyParser.json());

dishRouter.route('/')
.get((req,res,next) => {
    Dishes.find({})
    .populate('comments.author')
	.then((dishes) => {
		res.send(dishes);
	})
	.catch((err) => console.log(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
	Dishes.create(req.body)
	.then((dish) => {
		res.send(dish);
	})
	.catch((err) => console.log(err));
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
	res.statusCode = 403;
	res.end("PUT operation is not supoorted on /dishes");
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
	Dishes.remove({})
	.then((resp) => {
		res.send(resp);
	})
	.catch((err) => console.log(err));
});


dishRouter.route('/:dishId')
.get((req,res,next) => {
    Dishes.findById(req.params.dishId)
    .populate('comments.author')
	.then((dish) => {
		res.send(dish);
	})
	.catch((err) => console.log(err));
})
.post(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
  res.statusCode = 403;
  res.end('POST operation not supported on /dishes/'+ req.params.dishId);
})
.put(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
	Dishes.findByIdAndUpdate(req.params.dishId, {
		$set: req.body,
	}, {
		new: true
	})
	.then((dish) => {
		res.send(dish);
	})
	.catch((err) => console.log(err));
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req,res,next) => {
	Dishes.findByIdAndRemove(req.params.dishId)
	.then((resp) => {
		res.send(resp);
	})
	.catch((err) => console.log(err));
});


dishRouter.route('/:dishId/comments')
.get((req,res,next) => {
    Dishes.findById(req.params.dishId)
    .populate('comments.author')
    .then((dish) => {
        if (dish != null) {
            res.json(dish.comments);
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null) {
            req.body.author = req.user._id;
            dish.comments.push(req.body);
            dish.save()
            .then((dish) => {
                Dishes.findById(dish._id)
                .populate('comments.author')
                .then((dish) => res.json(dish));
            }, (err) => next(err));
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.put(authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /dishes/' + req.params.dishId + '/comments');
})
.delete(authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null) {
            for (var i = (dish.comments.length -1); i >= 0; i--) {
                dish.comments.id(dish.comments[i]._id).remove();
            }
            dish.save()
            .then((dish) => {
                Dishes.findById(dish._id)
                .populate('comments.author')
                .then((dish) => res.json(dish));               
            }, (err) => next(err));
        }
        else {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
    }, (err) => next(err))
    .catch((err) => next(err));    
});

dishRouter.route('/:dishId/comments/:commentId')
.get((req,res,next) => {
    Dishes.findById(req.params.dishId)
    .populate('comments.author')
    .then((dish) => {
        if (dish != null && dish.comments.id(req.params.commentId) != null) {
            res.json(dish.comments.id(req.params.commentId));
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
        else {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            return next(err);            
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /dishes/'+ req.params.dishId
        + '/comments/' + req.params.commentId);
})
.put(authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null && dish.comments.id(req.params.commentId) != null) {
            if(req.user._id.equals(dish.comments[0].author)){
                if (req.body.rating) {
                    dish.comments.id(req.params.commentId).rating = req.body.rating;
                }
                if (req.body.comment) {
                    dish.comments.id(req.params.commentId).comment = req.body.comment;                
                }
                dish.save()
                .then((dish) => {
                    Dishes.findById(dish._id)
                    .populate('comments.author')
                    .then((dish) => res.json(dish));               
                }, (err) => next(err));
            } else {
                err = new Error('You are not authorised to update this comment');
                return next(err);
            }
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
        else {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            return next(err);            
        }
    }, (err) => next(err))
    .catch((err) => next(err));
})
.delete(authenticate.verifyUser, (req, res, next) => {
    Dishes.findById(req.params.dishId)
    .then((dish) => {
        if (dish != null && dish.comments.id(req.params.commentId) != null) {
            console.log('logged user id: ',req.user._id);
            console.log('author id: ',dish.comments[0].author);
            if(req.user._id.equals(dish.comments[0].author)){
                dish.comments.id(req.params.commentId).remove();
                dish.save()
                .then((dish) => {
                    Dishes.findById(dish._id)
                    .populate('comments.author')
                    .then((dish) => res.json(dish));                
                }, (err) => next(err));
            } else {
                err = new Error('You are not authorised to delete this comment');
                return next(err);
            }
        }
        else if (dish == null) {
            err = new Error('Dish ' + req.params.dishId + ' not found');
            return next(err);
        }
        else {
            err = new Error('Comment ' + req.params.commentId + ' not found');
            return next(err);            
        } 
    }, (err) => next(err))
    .catch((err) => next(err));
});

module.exports = dishRouter;