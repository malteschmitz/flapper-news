var app = angular.module('flapperNews', ['ui.router']);

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
  $stateProvider
  .state('home', {
    url: '/home',
    templateUrl: '/home.html',
    controller: 'MainCtrl',
    resolve: {
      postPromise: ['posts', function(posts) {
        return posts.getAll()
      }]
    }
  })
  .state('posts', {
    url: '/posts/{id}',
    templateUrl: '/posts.html',
    controller: 'PostsCtrl',
    resolve: {
      post: ['$stateParams', 'posts', function($stateParams, posts) {
        return posts.get($stateParams.id);
      }]
    }
  })
  .state('login', {
  url: '/login',
  templateUrl: '/login.html',
  controller: 'AuthCtrl',
  onEnter: ['$state', 'auth', function($state, auth){
    if(auth.isLoggedIn()){
      $state.go('home');
    }
  }]
})
.state('register', {
  url: '/register',
  templateUrl: '/register.html',
  controller: 'AuthCtrl',
  onEnter: ['$state', 'auth', function($state, auth){
    if(auth.isLoggedIn()){
      $state.go('home');
    }
  }]
});

  $urlRouterProvider.otherwise('home');
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
  var auth = {
    saveToken: function(token) {
      $window.localStorage['flapper-news-token'] = token;
    },
    getToken: function() {
      return $window.localStorage['flapper-news-token']
    },
    isLoggedIn: function() {
      var token = auth.getToken();
      if (token) {
        var payload = JSON.parse($window.atob(token.split('.')[1]));
        return payload.exp > Date.now() / 1000;
      }
      return false;
    },
    currentUser: function() {
      if (auth.isLoggedIn()) {
        var token = auth.getToken();
        var payload = JSON.parse($window.atob(token.split('.')[1]));
        return payload.username;
      }
    },
    register: function(user) {
      return $http.post('/register', user).success(function(data) {
        auth.saveToken(data.token);
      });
    },
    login: function(user) {
      return $http.post('/login', user).success(function(data) {
        auth.saveToken(data.token);
      });
    },
    logout: function() {
      $window.localStorage.removeItem('flapper-news-token');
    }
  };

  return auth;
}]);

app.factory('posts', ['$http', 'auth', function($http, auth) {
  var o = {posts: []};

  o.getAll = function() {
    return $http.get('/posts').success(function(data) {
      angular.copy(data, o.posts);
    });
  };

  o.create = function(post) {
    return $http.post('/posts', post, {
      headers: {
        Authorization: 'Bearer ' + auth.getToken()
      }
    }).success(function (data) {
      o.posts.push(data);
    });
  };

  o.createComment = function(post, comment) {
    return $http.post('/posts/' + post._id + '/comments', comment, {
      headers: {
        Authorization: 'Bearer ' + auth.getToken()
      }
    }).success(function (data) {
      post.comments.push(data);
    });
  };

  o.upvote = function(post) {
    return $http.put('/posts/' + post._id + '/upvote', null, {
      headers: {
        Authorization: 'Bearer ' + auth.getToken()
      }
    }).success(function(data) {
      post.upvotes = data.upvotes;
    });
  };

  o.upvoteComment = function(comment) {
    return $http.put('/comments/' + comment._id + '/upvote', null, {
      headers: {
        Authorization: 'Bearer ' + auth.getToken()
      }
    }).success(function(data) {
      comment.upvotes = data.upvotes;
    });
  };

  o.get = function(id) {
    return $http.get('/posts/' + id).then(function(res) {
      return res.data;
    });
  };

  return o;
}]);

/*
app.factory('posts', function () {
  var posts = [];
  var lastId = 0;
  function addPost(post) {
    lastId += 1;
    post.id = lastId;
    posts.push(post);
  }
  function allPosts() {
    return [].concat(posts);
  }
  function getPost(id) {
    for (index in posts) {
      var post = posts[index];
      if (post.id === id) {
        return post;
      }
    }
  }

  addPost({title: 'Post 1', link: 'http://www.mlte.de', upvotes: 5, comments: [
      {author: 'Joe', body: 'Cool post!', upvotes: 2},
      {author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 8},
    ]});
  addPost({title: 'Post 2', upvotes: 2});
  addPost({title: 'Post 3', upvotes: 15});
  addPost({title: 'Post 4', upvotes: 9});
  addPost({title: 'Post 5', upvotes: 4});
  addPost({title: 'Post 6', upvotes: 6});

  return {getPost: getPost, allPosts: allPosts, addPost: addPost};
});
*/

app.controller('NavCtrl', ['$scope', 'auth', function($scope, auth) {
  $scope.isLoggedIn = auth.isLoggedIn;
  $scope.currentUser = auth.currentUser;
  $scope.logout = auth.logout;
}]);

app.controller('AuthCtrl', ['$scope', '$state', 'auth', function($scope, $state, auth) {
  $scope.user = {};
  
  $scope.register = function() {
    auth.register($scope.user).error(function(error) {
      $scope.error = error;
    }).then(function(){
      $state.go('home');
    })
  };

  $scope.login = function() {
    auth.login($scope.user).error(function(error) {
      $scope.error = error;
    }).then(function() {
      $state.go('home');
    });
  }
}]);

app.controller('MainCtrl', ['$scope', 'posts', 'auth', function ($scope, posts, auth) {
  $scope.posts = posts.posts;
  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.upvote = function (post) {
    posts.upvote(post);
  };

  $scope.addPost = function () {
    posts.create({title: $scope.title, link:$scope.link});
    $scope.title = '';
    $scope.link = '';
  };
}]);

app.controller('PostsCtrl', ['$scope', 'posts', 'post', 'auth', function($scope, posts, post, auth) {
  $scope.post = post;
  $scope.isLoggedIn = auth.isLoggedIn;

  $scope.upvote = function (comment) {
    posts.upvoteComment(comment);
  };

  $scope.addComment = function () {
    posts.createComment(post, {body: $scope.body});
    $scope.body = '';
  };
}]);