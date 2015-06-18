// app.js

var cloudApp = angular.module('cloudApp',['cloudKit','ipCookie','mgcrea.ngStrap','ngRoute','ngDisqus','btford.markdown','hc.marked']);

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
    // console.log(user);
    if(user && user.login) {
      if($location.path() == "/login") {
        $location.path("/dashboard");
      }
      User.get({records:[{recordName:user.login.userRecordName}]},function(result){
        $rootScope.currentuser = result.records[0];

        $scope.$watch("currentuser.record.fields.blogs.value.length",function(blogs){
          if(blogs) {
          // if($scope.currentuser.record.fields.blogs.value[0]) {
            $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};

            var data = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};

            data.type = {value:'Post'};

            var posts = [];

            for (var i = 0; i <= 2; i++) {

              data.title = {value:Math.random().toString(36).substring(2)};
              data.text = {value:Math.random().toString(36).substring(2)};
              // console.log(data);
              posts.push(data);
            };

            // Post.save({records:posts},function(result){
            //   if(result.records) {
            //     angular.forEach(result.records,function(record){
            //       if(!$rootScope.posts) {
            //         $rootScope.posts = {records:[]};
            //       }
            //       $rootScope.posts.records.push(record);
            //     });
            //   } else if(result.record) {
            //     $rootScope.posts.records.push(result);
            //   }
            //     // $scope.bookmarks.total++;
            //     // $scope.newpost = {};
            //     // if($rootScope.currentuser.record.fields.blogs.value[0]) {
            //     //   $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};
            //     // }
            //     // $rootScope.loading = false;
            //     // console.log(result);
            // });
          // }
          }
        });
      });
      // Blog.query({query:{filterBy:[{comparator:"EQUALS",fieldName:"creatorUserRecordID",fieldValue:{value:user.userRecordName}}]}},function(result){
      //   $scope.blogs = result;
      // });
    } else if(user && !user.login) {
      $location.path("/login");
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
      $rootScope.loading = true;
      Post.save(newpost.fields,function(result){
        $rootScope.posts.records.push(result);
        // $scope.bookmarks.total++;
        $scope.newpost = {};
        if($rootScope.currentuser.record.fields.blogs.value[0]) {
          $scope.newpost.fields = {blog:{value:$rootScope.currentuser.record.fields.blogs.value[0]}};
        }
        $rootScope.loading = false;
        // console.log(result);
    });
  }

  $scope.parsedLink = false;

  $scope.checkImage = function(newimage,post,$event) {
    if(newimage) {
      // var img = angular.element("<img/>");
      var img = new Image();

      // console.log(newimage,post,$event);

      $(img).load(function(result) {
        $scope.$apply(function(){
          if(!post.fields.images) {
            post.fields.images = {value:[]};
          }
          post.fields.images.value.push(newimage);
          newimage = "";
          $scope.newimage = "";
          $scope.addFromURL = false;
        });
        // $event.target.textContent = "";
        // $event.target.focus();
      }).error(function () {
        // notify the user that the image could not be loaded
      }).attr('src', newimage); //+"?nocache=" + new Date().getTime()

      // img.src = newimage+"?nocache=" + new Date().getTime();
    }
  }

  $scope.checkURL = function(post,link) {
    $scope.checkingURL = true;
    if(link) {
      var url;
      var httpmatch = link.match(/(?:^http(?:s*):\/\/)/);
      if(!httpmatch) {
        url = "http://"+link;
      } else {
        url = link;
      }
      if(url) {
        $http.post("index.php",{url:url},{headers:{'Content-Type':'application/json'}}).success(function(result){
          if(result.video) {
            post.fields.video_embed = {value:result.video.embed_code};
            $scope.video = result.video.embed_code; //'<iframe width="100%" height="304" src="'+result.video+'?feature=oembed" frameborder="0" allowfullscreen></iframe>';
            $scope.parsedLink = true;
            $scope.checkingURL = false;
          }
          else if(result.title) {
            post.fields.link_title = {value:result.title};
            post.fields.link_description = {value:result.description};
            if(result.url) {
              post.fields.link = {value:result.url};
            } else {
              post.fields.link = {value:url};
            }
            if(result.thumbnail) {
              $scope.thumbnail = result.thumbnail;
            }
            if(result.author) {
              post.fields.link_author = {value:result.author};
            }
            if(result.image) {
              post.fields.images = {value:[result.image]};
            }
            if(result.tags) {
              if(angular.isArray(result.tags)) {
                var tags = result.tags;
              } else {
                var tags = result.tags.split(",");
              }
              if(!$scope.newpost.fields.tags_text) {
                post.fields.tags_text = {value:[]};
              }
              angular.forEach(tags,function(tag){
                post.fields.tags_text.value.push(tag);
              });
            }
            $scope.parsedLink = true;
            $scope.checkingURL = false;
          }
        });
      }
    }
  }

  $scope.removeImageFromImages = function(post,index) {
    post.fields.images.value.splice(index,1);
    if(post.fields.images.value.length == 0 ){
      $scope.addFromURL = false;
    }
  }

  $scope.removeImage = function(post) {
    $scope.thumbnail = null;
    delete $scope.newpost.fields.images;
  }

  $scope.removeVideo = function(post) {
    $scope.video = null;
    delete $scope.newpost.fields.video_embed;
  }

  $scope.removeLink = function(post) {
    post.fields.link = {value:null};
    post.fields.link_author = {value:null};
    post.fields.link_title = {value:null};
    post.fields.link_description = {value:null};
    post.fields.tags_text = {value:[]};
    $scope.parsedLink = false;
  }

  // $scope.newtag = '';

  $scope.addTag = function(newtag,$event,blur) {
    // console.log($event.keyCode);
    if($event.keyCode == 8 && !newtag) {
      $scope.newpost.fields.tags_text.value.splice(-1,1);
      // $scope.newpost.fields.tags.records.splice(-1,1);
    }
    if(($event.keyCode == 13 || $event.keyCode == 188 || blur) && newtag) {
      // if(newtag.match(/,/)) {
        newtag = newtag.replace(',','');
      // }
      if(!$scope.newpost.fields.tags_text) {
        $scope.newpost.fields.tags_text = {value:[]};
      }
      // if(!$scope.newpost.fields.tags) {
      //   $scope.newpost.fields.tags = {records:[]};
      // }
      $scope.newpost.fields.tags_text.value.push(newtag);
      // $scope.newpost.fields.tags.records.push({name:{value:newtag}});
      // console.log(angular.element($event.target));
      // angular.element($event.target).val("");
      $event.target.textContent = "";
      $event.target.focus();
    }
  }

}]);

cloudApp.controller("PostsController",['$rootScope','$scope','$filter','$cloudKit','Blog','Post','Types','$location','User','$timeout',function($rootScope,$scope,$filter,$cloudKit,Blog,Post,Types,$location,User,$timeout){
  var subdomain = $location.host().split(".")[0] != "cloudkit" ? $location.host().split(".")[0] : null;

  $scope.allrecords = true;

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
    $rootScope.loading = true;
    Post.query({query:{sortBy:[{fieldName:'___createTime',ascending:false}]}},function(result){
        $rootScope.posts = result;
        $rootScope.loading = false;
        $timeout(function(){
          $scope.allrecords = false;
        },3000);
    });
  }

  $scope.morePosts = function() {
    $scope.allrecords = true;
    // console.log($rootScope.posts);
    // $rootScope.posts.$query(function(result){
    //   console.log(result);
    //   $scope.allrecords = false;
    //   // $rootScope.posts = result;
    //   if(result.total == result.records.length) {
    //     $scope.allrecords = true;
    //   }
    // });
  }

  // console.log(Blog);
  // bookmarks.success(function(){
    
  // })

  $scope.orderby = function(post,field) {
    // console.log(posts,field);
    if(post.record && post.record.created) {
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
      // console.log($rootScope.posts.records);
      var posts = $filter("orderBy")($rootScope.posts.records,$scope.orderby,true);
      // console.log(posts);
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
      if(!post.record.fields.tags_text) {
        post.record.fields.tags_text = {value:[]};
      }
      post.record.fields.tags_text.value.push(newtag);
      // console.log(angular.element($event.target));
      // angular.element($event.target).val("");
      $event.target.textContent = "";
      $event.target.focus();
    }
  }

  $scope.savePost = function(post) {
    // console.log(post);
    post.$save();
  }
}]);

cloudApp.controller("TaggedController",['$rootScope','$routeParams','$scope','$cloudKit','Blog','Post','Types','$location','User',function($rootScope,$routeParams,$scope,$cloudKit,Blog,Post,Types,$location,User){
  var tag = $routeParams.tag;
  if(tag) {
    $scope.searchtag = tag;
    $rootScope.loading = true;
    Post.query({query:{sortBy:[{fieldName:'___createTime',ascending:false}],filterBy:[{comparator:"CONTAINS_ANY_TOKENS",fieldValue:{value:tag},fieldName:'tags_text'}]}},function(result){
        $rootScope.posts = result;
        $rootScope.loading = false;
        // $timeout(function(){
        //   $scope.allrecords = false;
        // },3000);
    });
  }

  // $scope.filterTag = function(post) {
  //   if(post.record.fields.tags_text && post.record.fields.tags_text.value.indexOf($routeParams.tag) != -1) {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

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
  // console.log($routeParams);

  $scope.search = $routeParams.search.replace("+"," ");

  if($routeParams.search) {
    Post.query({resultsLimit:10,query:{filterBy:[{comparator:"CONTAINS_ANY_TOKENS",fieldValue:{value:$routeParams.search}}]}},function(searchresult){
      $scope.postsearchresults = searchresult;
          // $scope.posts = $scope.blog.record.fields.posts.value;
    });
    Blog.query({resultsLimit:10,query:{filterBy:[{comparator:"CONTAINS_ANY_TOKENS",fieldValue:{value:$routeParams.search}}]}},function(searchresult){
      $scope.blogsearchresults = searchresult;
          // $scope.posts = $scope.blog.record.fields.posts.value;
    });
  }
}]);

cloudApp.controller("LoginController",['$rootScope','$routeParams','$scope','ipCookie',function($rootScope,$routeParams,$scope,ipCookie){
    // ipCookie.remove('iCloud.watchinharrison.Read-The-News');
    $scope.login = function() {
      window.open($rootScope.redirectUrl);
    }
    $rootScope.$watch("user",function(user){
      // console.log(user);
    });
}]);

cloudApp.controller("LogoutController",['$rootScope','$routeParams','$scope','ipCookie',function($rootScope,$routeParams,$scope,ipCookie){
    ipCookie.remove('iCloud.watchinharrison.Read-The-News');
}]);

cloudApp.directive('infiniteScroll', ['$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
        var ul = angular.element(elem).find("ul");        
        scrollDistance = 0;
        if (attrs.infiniteScrollDistance != null) {
          scope.$watch(attrs.infiniteScrollDistance, function(value) {
            return scrollDistance = parseInt(value, 10);
          });
        }
        scrollEnabled = true;
        checkWhenEnabled = false;
        if (attrs.infiniteScrollDisabled != null) {
          scope.$watch(attrs.infiniteScrollDisabled, function(value) {
            scrollEnabled = !value;
            if (scrollEnabled && checkWhenEnabled) {
              checkWhenEnabled = false;
              return handler();
            }
          });
        }
        handler = function() {
          var elementBottom, remaining, shouldScroll, windowBottom;
          windowBottom = elem.height() + elem.scrollTop();
          elementBottom = ul.height(); //ul.offset().top +
          // console.log(windowBottom,elementBottom);
          remaining = elementBottom - windowBottom;
          // console.log(remaining,elem.height(),scrollDistance,elem.scrollTop(),ul.offset().top,ul.height());
          shouldScroll = remaining <= elem.height() * scrollDistance;
          // console.log(shouldScroll,scrollEnabled);
          if (shouldScroll && scrollEnabled) {
            if ($rootScope.$$phase) {
              return scope.$eval(attrs.infiniteScroll);
            } else {
              return scope.$apply(attrs.infiniteScroll);
            }
          } else if (shouldScroll) {
            return checkWhenEnabled = true;
          }
        };
        // console.log(elem);
        elem.on('scroll', handler);
        scope.$on('$destroy', function() {
          return elem.off('scroll', handler);
        });
        return $timeout((function() {
          if (attrs.infiniteScrollImmediateCheck) {
            if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
              return handler();
            }
          } else {
            return handler();
          }
        }), 0);

        scope.$on('$destroy', function() {
            handler = null;
        });
      }
    };
  }
]);

cloudApp.directive('windowInfiniteScroll', ['$rootScope', '$window', '$timeout', function($rootScope, $window, $timeout) {
    return {
      link: function(scope, elem, attrs) {
        var checkWhenEnabled, handler, scrollDistance, scrollEnabled;
        $window = $(window);
        // console.log(elem);
        scrollDistance = 0;
        if (attrs.infiniteScrollDistance != null) {
          scope.$watch(attrs.infiniteScrollDistance, function(value) {
            return scrollDistance = parseInt(value, 10);
          });
        }
        scrollEnabled = true;
        checkWhenEnabled = false;
        if (attrs.infiniteScrollDisabled != null) {
          scope.$watch(attrs.infiniteScrollDisabled, function(value) {
            scrollEnabled = !value;
            if (scrollEnabled && checkWhenEnabled) {
              checkWhenEnabled = false;
              return handler();
            }
          });
        }
        handler = function() {
          // console.log(window);
          var elementBottom, remaining, shouldScroll, windowBottom;
          windowBottom = $window.height() + $window.scrollTop();
          elementBottom = $(elem).offset().top + $(elem).height();
          remaining = elementBottom - windowBottom;
          shouldScroll = remaining <= $window.height() * scrollDistance;
          // console.log("WINDOW SCROLL!",remaining,$window.height(),elementBottom,windowBottom);
          if (shouldScroll && scrollEnabled) {
            if ($rootScope.$$phase) {
              return scope.$eval(attrs.windowInfiniteScroll);
            } else {
              return scope.$apply(attrs.windowInfiniteScroll);
            }
          } else if (shouldScroll) {
            return checkWhenEnabled = true;
          }
        };
        $window.on('scroll', handler);
        scope.$on('$destroy', function() {
          return $window.off('scroll', handler);
        });
        return $timeout((function() {
          if (attrs.infiniteScrollImmediateCheck) {
            if (scope.$eval(attrs.infiniteScrollImmediateCheck)) {
              return handler();
            }
          } else {
            return handler();
          }
        }), 0);

        scope.$on('$destroy', function() {
            handler = null;
        });
      }
    };
  }
]);

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
                          values = values.concat(ngModel.$viewValue);
                        	ngModel.$setViewValue(values);
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


cloudApp.config(['$cloudKitProvider','$routeProvider','$httpProvider','$locationProvider','$disqusProvider','markdownConverterProvider','markedProvider',function($cloudKitProvider,$routeProvider,$httpProvider,$locationProvider,$disqusProvider,markdownConverterProvider,markedProvider) {
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

  markedProvider.setOptions({
    gfm: true,
    tables: true,
    highlight: function (code) {
      return hljs.highlightAuto(code).value;
    }
  });

  // markdownConverterProvider.config({
  //   extensions: ['github']
  // });

  $routeProvider.when('/', {
    templateUrl: 'partials/index.html',
    controller: 'PostsController',
    redirectTo: function(params,path,search) {
      if(!$cloudKitProvider.user) {
        return "/login"
      } else {
        return "/dashboard"
      }
    },
    resolve: {
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/login', {
    templateUrl: 'partials/login.html',
    controller: 'LoginController',
    resolve: {
      // logout: function() {
      //   return true;
      // }
      // I will cause a 1 second delay
      // delay: function($q, $timeout) {
      //   var delay = $q.defer();
      //   $timeout(delay.resolve, 1000);
      //   return delay.promise;
      // }
    }
  }).when('/logout', {
    templateUrl: 'partials/posts.html',
    controller: 'LogoutController',
    resolve: {
      // logout: function() {
      //   return true;
      // }
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
  }).when('/tags/:tag', {
    templateUrl: 'partials/posts.html',
    controller: 'TaggedController',
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
    	// type: new Model.belongsTo(Types),
      type: 'string',
    	// content: new Model.belongsTo(Content),
      blog: new Model.belongsTo(Blog),
    	comments: new Model.hasMany(Comment),
    	// tags: new Model.hasMany(Tag),
      tags_text: 'string',
    	title: 'string',
    	url: 'string',
      link: 'string',
      text: 'string',
      link_title: 'string',
      link_description: 'string',
      link_author: 'string',
      images: 'files',
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