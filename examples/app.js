// app.js

var cloudApp = angular.module('cloudApp',['cloudKit','ipCookie','mgcrea.ngStrap','ngRoute']);

cloudApp.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

cloudApp.controller("MainController",['$rootScope','$scope','$cloudKit','Blog','Post','Types','$location','User','$routeParams',function($rootScope,$scope,$cloudKit,Blog,Post,Types,$location,User,$routeParams){
  $scope.doSearch = function(search) {
    // ,type:"string"
    $location.path("/search/"+search);
  }

  $scope.newpost = {};

  $rootScope.$watch("user",function(user){
    if(user) {
      User.get({records:[{recordName:user.userRecordName}]},function(result){
        $scope.currentuser = result.records[0];

        $scope.$watch("currentuser.record.fields.blogs.value.length",function(blogs){
          if(blogs) {
          // if($scope.currentuser.record.fields.blogs.value[0]) {
            $scope.newpost.fields = {blog:{value:$scope.currentuser.record.fields.blogs.value[0]}};
          // }
          }
        });
      });
      // Blog.query({query:{filterBy:[{comparator:"EQUALS",fieldName:"creatorUserRecordID",fieldValue:{value:user.userRecordName}}]}},function(result){
      //   $scope.blogs = result;
      // });
    }
  });

   $scope.newPost = function(newpost) {
    // newpost.fields.blog = {}
    // console.log();
    // var blog = $scope.blogs.records[0].record;
    // newpost.fields.blog.record = {recordChangeTag:blog.recordChangeTag,recordName:blog.recordName,zoneID:{zoneName:"_defaultZone"},action:"NONE"};
    // operations:[{operationType:'create',record:{recordType:'Bookmarks',fields:newbookmark.fields}}]
      Post.save(newpost.fields,function(result){
        $rootScope.posts.records.push(result);
        // $scope.bookmarks.total++;
        $scope.newpost = {};
        if($scope.currentuser.record.fields.blogs.value[0]) {
          $scope.newpost.fields = {blog:{value:$scope.currentuser.record.fields.blogs.value[0]}};
        }
        // console.log(result);
    });
  }
}]);

cloudApp.controller("PostsController",['$rootScope','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$scope,$cloudKit,Blog,Post,Types,$location,User){
  var subdomain = $location.host().split(".")[0] != "cloudkit" ? $location.host().split(".")[0] : null;

  if(subdomain) {
    Blog.query({query:{filterBy:[{comparator:"EQUALS",fieldName:"title",fieldValue:{value:subdomain}}]}},function(result){
      $scope.blog = result.records[0];
      var recordReference = {recordName:$scope.blog.record.recordName}; //,action:"NONE" ,zoneID:{zoneName:"_defaultZone"}
      // ,type:"REFERENCE"
      Post.query({query:{filterBy:[{comparator:"EQUALS",fieldName:"blog",fieldValue:{value:recordReference,type:"REFERENCE"}}]}},function(blogpostsresult){
        console.log(blogpostsresult);
        // $scope.posts = $scope.blog.record.fields.posts.value;
      });

    });
  } else {
    Post.query({resultsLimit:10},function(result){
        $rootScope.posts = result;
    });
  }

  // console.log(Blog);
  // bookmarks.success(function(){
    
  // })

  $scope.orderby = function(post,field) {
    // console.log(posts,field);
    if(post.record) {
      return post.record.created.timestamp;
    }
  }

  $scope.saveAll = function() {
    $scope.bookmarks.$save(function(suc){
      console.log(suc);
    },function(err){
      console.log(err);
    });
  }

  $scope.checkURL = function(link) {
    if(link) {
      link.title = {value:"New URL"};
    }
  }

  $scope.newBlog = function(newblog) {
    Blog.save(newblog.fields,function(result){
      $scope.blogs.records.push(result);
        // $scope.bookmarks.total++;
      $scope.newblog = {};
    });
  }

  $scope.deletePost = function(post,index) {
    post.$remove(function(res){
      $rootScope.posts.records.splice(1,index);
    });
  }

  $scope.savePost = function(post) {
    post.$save();
  }
}]);

cloudApp.controller("PostController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){
  Post.get({recordName:$routeParams},function(result){
    console.log(result);
    $scope.post = result;
  });
}]);

cloudApp.controller("SearchController",['$scope','$routeParams','Post','Blog',function($scope,$routeParams,Post,Blog){
  console.log($routeParams);

  $scope.search = $routeParams.search;

  if($routeParams.search) {
    Post.query({resultsLimit:10,query:{filterBy:[{comparator:"CONTAINS_ALL_TOKENS",fieldValue:{value:$routeParams.search}}]}},function(searchresult){
      $scope.postsearchresults = searchresult;
          // $scope.posts = $scope.blog.record.fields.posts.value;
    });
    Blog.query({resultsLimit:10,query:{filterBy:[{comparator:"CONTAINS_ALL_TOKENS",fieldValue:{value:$routeParams.search}}]}},function(searchresult){
      $scope.blogsearchresults = searchresult;
          // $scope.posts = $scope.blog.record.fields.posts.value;
    });
  }
}]);

cloudApp.directive('appFilereader', function($q) {
    var slice = Array.prototype.slice;

    return {
        restrict: 'A',
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
                if (!ngModel) return;

                ngModel.$render = function() {};

                element.bind('change', function(e) {
                    var element = e.target;

                    $q.all(slice.call(element.files, 0).map(readFile)).then(function(values) {
                            if (element.multiple) { 
                            	ngModel.$setViewValue(values);
                            	// var filevalue = [];
                            	// angular.forEach(values,function(value){
                            	// 	filevalue.push({image:{value:value},title:{value:""},caption:{value:""}});
                            	// });                            	
                            	// ngModel.$setViewValue(filevalue);
                            }
                            else {
                            	ngModel.$setViewValue(values.length ? values[0] : null);
                            	// ngModel.$setViewValue({image:{value:values.length ? values[0] : null},title:{value:""},caption:{value:""}});
                            }
                        });

                    function readFile(file) {
                        var deferred = $q.defer();

                        var reader = new FileReader();
                        reader.onload = function(e) {
                            deferred.resolve(e.target.result);
                        };
                        reader.onerror = function(e) {
                            deferred.reject(e);
                        };
                        reader.readAsDataURL(file);

                        return deferred.promise;
                    }

                }); //change

            } //link
    }; //return
});


cloudApp.config(['$cloudKitProvider','$routeProvider','$httpProvider',function($cloudKitProvider,$routeProvider,$httpProvider) {
	var connection = {
		container: 'iCloud.watchinharrison.Read-The-News',
		api: '309696db24cbfcc1b79a0750af4dfa92b89588bc5bbbf16ea9fdebe9d2b3446d',
		environment: 'development',
		database:'public'
	}
  // $httpProvider.defaults.headers['Content-Type'] = null;
	$cloudKitProvider.connection(connection);

  $routeProvider.when('/', {
    templateUrl: 'partials/posts.html',
    controller: 'PostsController',
    resolve: {
      // I will cause a 1 second delay
      delay: function($q, $timeout) {
        var delay = $q.defer();
        $timeout(delay.resolve, 1000);
        return delay.promise;
      }
    }
  }).when('/posts/:id', {
    templateUrl: 'partials/post.html',
    controller: 'PostController',
    resolve: {
      // I will cause a 1 second delay
      delay: function($q, $timeout) {
        var delay = $q.defer();
        $timeout(delay.resolve, 1000);
        return delay.promise;
      }
    }
  }).when('/search/:search', {
    templateUrl: 'partials/search.html',
    controller: 'SearchController',
    resolve: {
      // I will cause a 1 second delay
      delay: function($q, $timeout) {
        var delay = $q.defer();
        $timeout(delay.resolve, 1000);
        return delay.promise;
      }
    }
  });

  	// $cloudKitProvider.connection({
   //  	// Change this to a container identifier you own.
   //  	containerIdentifier: 'iCloud.watchinharrison.Tankiku',

   //  	// And generate an API token through CloudKit Dashboard.
   //  	apiToken: 'c4dc7bcd62035f7ca039b7e9a5c331cab632b3feb380f67aecf1393e28afafb9',

   //  	auth: {
   //    		buttonSize: 'medium',
   //    		persist: true // Sets a cookie.
   //  	},
   //  	environment: 'development'
  	// });
}]);


cloudApp.factory('Types', ['$cloudKit',function($cloudKit){
    return $cloudKit('Types','_defaultZone', {
    	type: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Content', ['$cloudKit','Model','Images','Link',function($cloudKit,Model,Images,Link){
    return $cloudKit('Content','_defaultZone', {
    	image: new Model.hasMany(Images),
    	link: new Model.hasMany(Link),
    	text: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Images', ['$cloudKit',function($cloudKit){
    return $cloudKit('Images','_defaultZone', {
    	image: 'file',
    	title: 'string',
    	description: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Tag', ['$cloudKit',function($cloudKit){
    return $cloudKit('Tag','_defaultZone', {
    	name: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Link', ['$cloudKit',function($cloudKit){
    return $cloudKit('Link','_defaultZone', {
    	description: 'string',
    	title: 'string'
    }, {}, {
      query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
      get: {method:'POST', params:{importId:'@importId'}},
      save: {method:'POST',params:{importId:'@importId'}},
      remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

// ,'Post'
// ,'BlogPost' BlogPost
cloudApp.factory('Blog', ['$cloudKit','Model',function($cloudKit,Model){
  // console.log(Content);
    return $cloudKit('Blog','_defaultZone', {
      // posts: new Model.hasMany(BlogPost),
      // post: Model.belongsTo(Post)
  },{}, {
    query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
    get: {method:'POST', params:{importId:'@importId'}},
    save: {method:'POST',params:{importId:'@importId'}},
    remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

// ,'Post'
// cloudApp.factory('BlogPost',['$cloudKit','Model','Post',function($cloudKit,Model,Post){
//   return $cloudKit('Post','_defaultZone', {
//       post: new Model.belongsTo(Post)
//   },{}, {
//     query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
//     get: {method:'POST', params:{importId:'@importId'}},
//     save: {method:'POST',params:{importId:'@importId'}},
//     remove: {method:'DELETE',params:{importId:'@importId'}}
//   });
// }]);

cloudApp.factory('Post', ['$cloudKit','$injector','Model','Content','Types','Comment','Tag','Blog',function($cloudKit,$injector,Model,Content,Types,Comment,Tag,Blog){
	// console.log(Content);
    // var Blog = $injector.get('Blog');
    return $cloudKit('Post','_defaultZone', {
    	type: new Model.belongsTo(Types),
    	content: new Model.belongsTo(Content),
      blog: new Model.belongsTo(Blog),
    	comments: new Model.hasMany(Comment),
    	tags: new Model.hasMany(Tag),
    	title: 'string',
    	url: 'string',
    	allow_comments: 'bool'
	},{}, {
		query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
		get: {method:'POST', params:{importId:'@importId'}},
		save: {method:'POST',params:{importId:'@importId'}},
		remove: {method:'POST',params:{importId:'@importId'}}
	});
}]);

cloudApp.factory('Comment', ['$cloudKit','Model','Content',function($cloudKit,Model,Content){
	// console.log(Content);
    return $cloudKit('Comment','_defaultZone', {
    	content: new Model.belongsTo(Content),
    	// post: Model.belongsTo(Post)
	},{}, {
		query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
		get: {method:'POST', params:{importId:'@importId'}},
		save: {method:'POST',params:{importId:'@importId'}},
		remove: {method:'POST',params:{importId:'@importId'}}
	});
}]);

cloudApp.factory('User', ['$cloudKit','Model','Blog',function($cloudKit,Model,Blog){
  // console.log(Content);
    return $cloudKit('User','_defaultZone', {
      blogs: new Model.belongsTo(Blog),
      // post: Model.belongsTo(Post)
  },{}, {
    query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
    get: {method:'POST', params:{importId:'@importId'}},
    save: {method:'POST',params:{importId:'@importId'}},
    remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

// cloudApp.factory('UserBookmarkLU', ['$cloudKit',function($cloudKit){
//     return $cloudKit('UserBookmarkLU','blogZone', {}, {
//       query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
//       get: {method:'POST', params:{importId:'@importId'}},
//       save: {method:'POST',params:{importId:'@importId'}},
//       remove: {method:'DELETE',params:{importId:'@importId'}}
//   });
// }]);

// cloudApp.run(function($rootScope,$cloudKit) {
// 	console.log($cloudKit,"Cloud Kit");
// });