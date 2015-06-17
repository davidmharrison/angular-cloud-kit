// app.js

var cloudApp = angular.module('cloudApp',['cloudKit','ipCookie','mgcrea.ngStrap','ngRoute','ngDisqus']);

cloudApp.filter('to_trusted', ['$sce', function($sce){
    return function(text) {
        return $sce.trustAsHtml(text);
    };
}]);

cloudApp.controller("MainController",['$rootScope','$scope','$cloudKit','$modal','Blog','Post','Types','$location','User','$routeParams','$http',function($rootScope,$scope,$cloudKit,$modal,Blog,Post,Types,$location,User,$routeParams,$http){
  $scope.doSearch = function(search) {
    // ,type:"string"
    $location.path("/search/"+search);
  }

  $scope.newpost = {};

  $scope.openModal = function(type) {
    $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};
    $scope.newpost.fields.type = {value: type};
    var myOtherModal = $modal({container:'body',animation:'am-fade-and-slide-top',scope: $scope, template: 'modal/newpost.tpl.html', show: true});
    console.log(myOtherModal,type);
  }

  $rootScope.$watch("user",function(user){
    if(user) {
      User.get({records:[{recordName:user.userRecordName}]},function(result){
        $rootScope.currentuser = result.records[0];

        $scope.$watch("currentuser.record.fields.blogs.value.length",function(blogs){
          if(blogs) {
          // if($scope.currentuser.record.fields.blogs.value[0]) {
            $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};
          // }
          }
        });
      });
      // Blog.query({query:{filterBy:[{comparator:"EQUALS",fieldName:"creatorUserRecordID",fieldValue:{value:user.userRecordName}}]}},function(result){
      //   $scope.blogs = result;
      // });
    }
  });

  Types.query({},function(typeresult){
    $scope.types = typeresult;
  });

   $scope.newPost = function(newpost) {
    // newpost.fields.blog = {}
    // console.log();
    // var blog = $scope.blogs.records[0].record;
    // newpost.fields.blog.record = {recordChangeTag:blog.recordChangeTag,recordName:blog.recordName,zoneID:{zoneName:"_defaultZone"},action:"NONE"};
    // operations:[{operationType:'create',record:{recordType:'Bookmarks',fields:newbookmark.fields}}]
    // delete newpost.fields.content.image.value[0]
      Post.save(newpost.fields,function(result){
        $rootScope.posts.records.push(result);
        // $scope.bookmarks.total++;
        $scope.newpost = {};
        if($rootScope.currentuser.record.fields.blogs.value[0]) {
          $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};
        }
        // console.log(result);
    });
  }

  $scope.parsedLink = false;

  $scope.checkURL = function(link) {
    if(link) {
      var url;
      var httpmatch = link.url.value.match(/(?:^http(?:s*):\/\/)/);
      if(!httpmatch) {
        url = "http://"+link.url.value;
      } else {
        url = link.url.value;
      }
      if(url) {
        $http.post("index.php",{url:url},{headers:{'Content-Type':'application/json'}}).success(function(result){
          if(result.title) {
            link.title = {value:result.title};
            link.description = {value:result.description};
            if(result.url) {
              link.url.value = result.url;
            } else {
              link.url.value = url;
            }
            if(result.thumbnail) {
              $scope.thumbnail = result.thumbnail;
            }
            if(result.author) {
              link.author = {value:result.author};
            }
            if(result.image) {
              $scope.newpost.fields.content.image = {image:{value:[result.image]}};
            }
            if(result.tags) {
              var tags = result.tags.split(",");
              if(!$scope.newpost.fields.tags) {
                $scope.newpost.fields.tags = {records:[]};
              }
              angular.forEach(tags,function(tag){
                $scope.newpost.fields.tags.records.push({name:{value:tag}});
              });
            }
            $scope.parsedLink = true;
          }
        });
      }
    }
  }

  $scope.removeImage = function(post) {
    $scope.thumbnail = null;
    delete $scope.newpost.fields.content.image;
  }

  // $scope.newtag = '';

  $scope.addTag = function(newtag,$event,blur) {
    // console.log($event.keyCode);
    if($event.keyCode == 8 && !newtag) {
      $scope.newpost.fields.tags.records.splice(-1,1);
    }
    if(($event.keyCode == 13 || $event.keyCode == 188 || blur) && newtag) {
      // if(newtag.match(/,/)) {
        newtag = newtag.replace(',','');
      // }
      if(!$scope.newpost.fields.tags) {
        $scope.newpost.fields.tags = {records:[]};
      }
      $scope.newpost.fields.tags.records.push({name:{value:newtag}});
      // console.log(angular.element($event.target));
      // angular.element($event.target).val("");
      $event.target.textContent = "";
      $event.target.focus();
    }
  }

}]);

cloudApp.controller("PostsController",['$rootScope','$scope','$filter','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$scope,$filter,$cloudKit,Blog,Post,Types,$location,User){
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

  $scope.likePost = function(post) {
    console.log(post);
  }

  $scope.deletePost = function(post,index) {
    post.$remove(function(res){
      // console.log(1,index);
      var posts = $filter("orderBy")($rootScope.posts.records,$scope.orderby,true);
      posts.splice(index,1);
      $rootScope.posts.records = posts;
      // console.log($rootScope.posts,posts);
    });
  }

  $scope.addTag = function(newtag,post,$event,blur) {
    // console.log($event);
    if(($event.keyCode == 13 || $event.keyCode == 188 || blur) && newtag) {
      // if(newtag.match(/,/)) {
        newtag = newtag.replace(',','');
      // }
      if(!post.record.fields.tags) {
        post.record.fields.tags = {value:[]};
      }
      post.record.fields.tags.value.push({fields:{name:{value:newtag}}});
      // console.log(angular.element($event.target));
      // angular.element($event.target).val("");
      $event.target.textContent = "";
      $event.target.focus();
    }
  }

  $scope.savePost = function(post) {
    post.$save();
  }
}]);

cloudApp.controller("BlogController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){
  $scope.newBlog = function(newblog) {
    Blog.save(newblog.fields,function(result){
      $scope.blogs.push(result);
        // $scope.bookmarks.total++;
      $scope.newblog = {};
    });
  }
}]);

cloudApp.controller("AccountController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){

}]);

cloudApp.controller("LikesController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){
  
}]);

cloudApp.controller("FollowingController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Following','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Following,$location,User){
  // $scope.following = $currentuser.record.fields.following;
  $rootScope.$watch("user",function(user){
    if(user) {
      // {query:{filterBy:[{comparator:"EQUALS",fieldName:"___createdBy",fieldValue:{value:user}}]}}
      Following.query({},function(result){
        $scope.following = result;
      });
    }
  });
  $scope.unfollow = function(follow,index) {
    follow.$remove(function(){
      $scope.following.splice(index,1);
    });
  }
}]);

cloudApp.controller("PostController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){
  Post.get({records:[{recordName:$routeParams.id}]},function(result){
    // console.log(result);
    $scope.post = result.records[0];
    $scope.contentLoaded = true;
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

cloudApp.directive("contenteditable", function() {
  return {
    restrict: "A",
    require: "ngModel",
    link: function(scope, element, attrs, ngModel) {

      function read() {
        ngModel.$setViewValue(element.html());
      }

      ngModel.$render = function() {
        element.html(ngModel.$viewValue || "");
      };

      element.bind("blur keyup change", function() {
        scope.$apply(read);
      });
    }
  };
});

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
                            	ngModel.$setViewValue([values.length ? values[0] : null]);
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


cloudApp.config(['$cloudKitProvider','$routeProvider','$httpProvider','$locationProvider','$disqusProvider',function($cloudKitProvider,$routeProvider,$httpProvider,$locationProvider,$disqusProvider) {
	var connection = {
		container: 'iCloud.watchinharrison.Read-The-News',
		api: '309696db24cbfcc1b79a0750af4dfa92b89588bc5bbbf16ea9fdebe9d2b3446d',
		environment: 'development',
		database:'public'
	}
  $httpProvider.defaults.headers.post['Content-Type'] = undefined;
  $httpProvider.defaults.cache = true;
  // $httpProvider.defaults.headers['Content-Type'] = null;
	$cloudKitProvider.connection(connection);
  // $locationProvider.html5Mode(true);
  // .rewriteLinks
  // $locationProvider.hashPrefix('');
  $disqusProvider.setShortname = "cloudkit";

  $routeProvider.when('/', {
    templateUrl: 'partials/posts.html',
    controller: 'PostsController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/dashboard', {
    templateUrl: 'partials/posts.html',
    controller: 'PostsController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/blog/new', {
    templateUrl: 'partials/newblog.html',
    controller: 'BlogController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/blog/:id', {
    templateUrl: 'partials/posts.html',
    controller: 'PostsController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/posts/:id', {
    templateUrl: 'partials/post.html',
    controller: 'PostController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/search/:search', {
    templateUrl: 'partials/search.html',
    controller: 'SearchController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/account', {
    templateUrl: 'partials/account.html',
    controller: 'AccountController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/likes', {
    templateUrl: 'partials/likes.html',
    controller: 'LikesController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/following', {
    templateUrl: 'partials/following.html',
    controller: 'FollowingController',
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
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
    	link: new Model.belongsTo(Link),
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
      query: {method:'POST', params:{},  isArray:true,headers: {'Content-Type': undefined}},
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
    query: {method:'POST', params:{},  isArray:true,headers: {'Content-Type': undefined}},
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
      // following: new Model.hasMany(Blog)
      // post: Model.belongsTo(Post)
  },{}, {
    query: {method:'POST', params:{}, isArray:true,headers: {'Content-Type': undefined}},
    get: {method:'POST', params:{importId:'@importId'}},
    save: {method:'POST',params:{importId:'@importId'}},
    remove: {method:'POST',params:{importId:'@importId'}}
  });
}]);

cloudApp.factory('Following', ['$cloudKit','Model','Blog',function($cloudKit,Model,Blog){
  // console.log(Content);
    return $cloudKit('Following','_defaultZone', {
      blog: new Model.belongsTo(Blog),
      // following: new Model.hasMany(Blog)
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