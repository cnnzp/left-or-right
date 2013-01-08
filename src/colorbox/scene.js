
__resources__["/__builtin__/scene.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var debug = require("debug")
  , NTreeNode = require("node").NTreeNode
  , pipe = require('pipe')
  , TimeStamper = require('director').TimeStamper
  , geo = require('geometry')
  , Klass = require("base").Klass
  , Trait = require("oo").Trait;

var sceneTrait = Trait.extend({
  initialize:function(param)
  {
    this.execProto("initialize");
  },

  addNode:function()
  {
    debug.error('cannot be here');
  },
  
  onActive: function(level)
  {
    debug.error("cannot be here");
  },
  
  onDeactive: function()
  {
    debug.error("cannot be here");
  },
  
  update: function(t)
  {
    this.exec("doUpdate", t);
  },
  
  filt:function(filter)
  {
    debug.error('cannot be here');
  }
});

var Scene = Klass.extend([sceneTrait]);

var treeSceneTrait = Trait.extend({
  initialize:function(param)
  {
    this.execProto("initialize");
    
    this.slot("_root", NTreeNode.create({scene:this}));

    this.slot("_root").exec("onEntered");
  },

  doUpdate: function (t)
  {
    this.slot("_root").exec("forEachActor", 
                    function (a) 
                    { 
                      a.tryExec("update", t); 
                    });
  },

  onActive: function(level)
  {
    var root = this.slot("_root");
  
    if (root)
      root.exec("onActive", this, level);
  },
  
  onDeactive: function(level)
  {
    var root = this.slot("_root");
    
    if (root)
      root.exec("onDeactive", this, level);
  },

  addNode:function(node, path)
  {
    if (path === undefined)
      path = this.slot("_root");

    debug.assert(this.exec("isNodeInScene", path) == true, "path is not in this scene");

    if (node.exec("parent") != undefined)
      this.exec("removeNode", node);
    
    path.exec("appendChild", node);
    
    //trigger active and enter
    var runningLevel = require("director").director().exec("getLevel")
    ,   bRunningScene = runningLevel && (this == runningLevel.exec("scene"));

    if (bRunningScene)
    {
      node.exec("onActive", this, runningLevel);
    }

    node.exec("onEntered", this);
  },

  isNodeInScene:function(n)
  {
    var root = this.slot("_root");
    var bIn = false;

    if (!root)
      return false;

    return root.exec("some", 
                     function(n1)
                     {
                       return n1 == n;
                     });
  },

  getNodeByActor:function(a)
  {
    var retNode;

    var root = this.slot("_root");
    if (!root)
      return undefined;

    root.exec("some",
              function(n)
              {
                if (a == n.exec("actor"))
                {
                  retNode = n;

                  return true;
                }

                return false;
              });

    return retNode;
  },

  addActor:function(a, pa)
  {
    var path;
    if (pa == undefined)
    {
      path = this.slot("_root");
    }
    else
      path = this.exec("getNodeByActor", pa);

    debug.assert(path, "parameter error in addActor");

    var node = this.exec("createNode", {actor:a});

    return this.exec("addNode", node, path);
  },
  
  createNode:function(param)
  {
    return NTreeNode.create(param);
  },

  removeNode:function(node)
  {
    //update actorsmap
    debug.assert(this.exec("isNodeInScene", node) == true, "remove nonexist node");

    var runningLevel = require("director").director().exec("getLevel");
    var bRunningScene = runningLevel && (runningLevel.exec("scene") == this);

    if (node.exec("parent"))
    {
      if (bRunningScene)
        node.exec("onDeactive", this, runningLevel);
      
      node.exec("onExit", this);

      return node.exec("parent").exec("removeChild", node);
    }
    else if (node && node == this.slot("_root"))
    {
      var oldOne = this.slot("_root");

      if (bRunningScene)
        oldOne.exec("onDeactive", this, runningLevel);
      
      oldOne.exec("onExit", this);

      var root = NTreeNode.create({scene:this});
      this.slot("_root", root);
      return oldOne;
    }
  },

  removeActor:function(actor)
  {
    var node = this.exec("getNodeByActor", actor);
    debug.assert(node != undefined, "remove unexist actor");
    return this.exec("removeNode", node);
  },
  
  // contianer must have push method
  filt:function(container, filter)
  {
    return this.slot("_root").exec("serializeChildrenActors", container, filter);
  }
  
});

var TreeScene = Scene.extend([treeSceneTrait]);



exports.TreeScene = TreeScene;

}};