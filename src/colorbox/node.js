
__resources__["/__builtin__/node.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var Klass = require("base").Klass
,   Trait = require("oo").Trait
,   animatorTrait = require("actortraits").animatorTrait
,   transformableTrait = require("transformable").transformableTrait
,   eventHandleTrait = require("actortraits").eventHandleTrait
,   debug = require("debug")
,   geo = require("geometry");

/**
 * @iclass[Node Object]{
 *   精灵对象��
 * }
 */

/**
 * @constructor[Node]{
     @param[(type undefined)]{
        精灵类型
     }

 *   @return{
 *    @para{alsjfdalf}
 *    精灵实例
 * }
 * 
 *   精灵构造函数��safd asdf 
 *   
  * }
 */
  
/**
 *  @method[test]{
      @class[Node]
 *    @param[(p1 v1)]{
 *     参数p1.用来干啥干啥干啥...
 *    }
 * 
 *    @param[p2]{
 *     参数p2. 类型:String
 *     blabla...
 *    
 *     @para{aslkjfakjsfdal;jsfajfja;lkf}
 *    }
 *    
 *    @param[p3 varargs]{
 *     可变参数，随便你��
 *    }
 *    @para{aslfdjal;fd}
 *    al;skdfja;lkfj 
 *    asd jlkajf 
 * 
 *    a dsfkl;fj 
 *    @return{
 *     askjfaj;f 
 *     adfj laf; kla
 *    }
 *  }
 */  

/**
 *  @function[type]{
 *   获取精灵type属性��
 *  }
*/

/**
 *  @method[addComponent]{
 *    为精灵添加一个新的component
      @para{zhangping}
 *    
 *    @class[Node]
 *
 *    @param[type]{
 *       component名称��
 *    }
 * 
 *    @param[component]{
 *       component对象��
 *    }
 *  }
 */ 

//FIXME: scene需要调整下
var actorTrait = Trait.extend({
  initialize:function(param)
  {
    param = param ? param : {};

    this.execProto("initialize");

    this.slot("_satelliteData", {});
    this.slot("_updates", []);

    this.slot("_scene", param.scene);
    
    this.slot("_model", param.model);
    
    this.slot("_type", param.type);
    
    this.exec("animatorInitialize");
    this.exec("transformableInitialize", require('director').timeStamp);

    this.exec("eventHandleInitialize", param);

    return this;
  },

  type:function()
  {
    return this.slot("_type");
  },

  model:function()
  {
    return this.slot("_model");
  },

  bbox:function(painter)
  {
    return geo.rectApplyMatrix(painter.exec("bbox", this.exec("model")), this.exec("matrix"));
  },

  setModel:function(model)
  {
    var oldOne = this.slot("_model");
    this.slot("_model", model);
    return oldOne;
  },
  
  emmitModels:function(v)
  {
    v.push({model:this.exec("model"), effect:{matrix:this.exec("matrix")}});
    return v;
  },

  emmitControlModels:function(v)
  {
    v.push({model:this.exec("model"), effect:{matrix:this.exec("matrix")}});
    return v;
  },

  // useActorMatrix:function(v)
  // {
  //   v.forEach(function(mp)
  //             {
  //               mp[1].matrix = geo.
  //             });
  // },
                       
  //FIXME: scene的处理貌似不是很妥当。在构造actor的时候可能不知道scene，每个actor都保存scene信息又显得多余，维护起来也麻烦��
  getScene:function()
  {
    return this.slot("_scene");
  },

  setScene:function(s)
  {
    var oldS = this.exec("getScene");
    this.slot("_scene", s);
    return oldS;
  },

  onActive:function()
  {
  },

  onDeactive:function()
  {
  },

  //这里应该增加参数scene
  onEntered:function()
  {
  },
  
  onExit:function()
  {
  },
  
  regUpdate: function(update)
  {
    debug.assert(-1 == this.slot("_updates").indexOf(update), "logical error");

    this.slot("_updates").push(update);
  },

  unRegUpdate:function(update)
  {
    debug.assert(-1 != this.slot("_updates").indexOf(update), "logical error");
    
    var updates = this.slot("_updates");

    updates.splice(updates.indexOf(update), 1);
  },

  update:function(t)
  {
    this.slot("_updates").forEach(function(u)
                                  {
                                    u.call(undefined, t, this);
                                  },
                                  this);
  },

  querySatelliteData:function(sname, initVal)
  {
    debug.assert(!this.slot("_satelliteData").hasOwnProperty(sname), "cannot query satellite data:" + sname);

    this.slot("_satelliteData")[sname] = initVal;

    return initVal;
  },

  satelliteData:function(sname, val)
  {
    if (arguments.length == 1)
    {
      return this.slot("_satelliteData")[sname];
    }
    else
    {
      this.slot("_satelliteData")[sname] = val;
      return val;
    }
  }
});

var Actor = Klass.extend([
  actorTrait, 
  animatorTrait.rename({initialize:"animatorInitialize"}),
  transformableTrait.rename({initialize:"transformableInitialize"}),
  eventHandleTrait.rename({initialize:"eventHandleInitialize"})]);


var NtreeNodeTrait = Trait.extend({
  initialize:function(param)
  {
    this.execProto("initialize", param);

    this.slot("_parent", undefined);

    var children = [];

    this.slot("_children", children);

    if (param.children)
      param.children.forEach(function(c)
                             {
                               children.push(c);
                             });

    this.slot("_actor", param.actor);
  },

  onActive:function(scene, level)
  {
    this.exec("forEachActor", 
              function(c)
              {
                c.exec("onActive", scene, level);
              });
  },

  onDeactive:function(scene, level)
  {
    this.exec("forEachActor", 
              function(c)
              {
                c.exec("onDeactive", scene, level);
              });
  },
  
  onEntered:function(scene)
  {
    this.exec("forEachActor",
              function(c)
              {
                c.exec("onEntered", scene);
              });
  },

  onExit:function(scene)
  {
    this.exec("forEachActor",
              function(c)
              {
                c.exec("onExit", scene);
              });
  },

  parent:function()
  {
    return this.slot("_parent");
  },

  actor:function()
  {
    return this.slot("_actor");
  },
  
  children:function()
  {
    return this.slot("_children");
  },

  appendChild: function(child)
  {
    debug.assert(NTreeNode.isPrototypeOf(child), "parameter error");
    debug.assert(child.slot("_parent") == undefined, "parameter error");

    this.slot("_children").push(child);
    child.slot("_parent",  this);
    
    //update actor's deptransformable
    if (!child.slot("_actor"))
    {
      return;
    }

    var getDepActor = function(node)
    {
      if (!node)
        return;

      var actor = node.slot("_actor");
      if (actor)
        return actor;

      //return arguments.callee(node.slot("_parent"));
      return getDepActor(node.slot("_parent"));
    };
    var depActor = getDepActor(this);

    if (depActor)
      child.slot("_actor").exec("setDepTransformable", depActor);
  },
  
  removeChild: function(child)
  {
    debug.assert(NTreeNode.isPrototypeOf(child), "parameter error");

    var idx = this.slot("_children").indexOf(child);
    
    debug.assert(idx != -1, "logical error, You remove an unexist child");
    
    var childActor = child.slot("_actor");
    if (childActor)
    {
      childActor.exec("setDepTransformable", null);
    }

    child.slot("_parent", null);
    this.slot("_children").splice(idx, 1);
  },

  some:function(f)
  {
    var children = this.exec("children");
    
    if (true == f(this))
      return true;

    return children.some(function(child)
                         {
                           return child.exec("some", f);
                         });
  },

  someActor:function(f)
  {
    var newf = function(n)
    {
      var a = n.exec("actor");
      if (a)
        return f(a);

      return false;
    };

    return this.exec("some", newf);
  },

  //f   (prev, curnode) --> anything
  reduce:function(f, initialize)
  {
    var bInitializeSupplied = arguments.length == 2;
    var ret;

    if (false == bInitializeSupplied)
    {
      ret = this;
    }
    else
    {
      ret = f(initialize, this);
    }

    var children = this.slot("_children");

    ret = children.reduce(function(prev, cur)
                          {
                            return cur.exec("reduce", f, prev);
                          },
                          ret);

    return ret;
  },

  reduceActor:function(f, initialize)
  {
    var newf = function(prev, curn)
    {
      var actor = curn.exec("actor");
      if (actor)
        return f(prev, actor);

      return prev;
    };

    if (arguments.length == 2)
      return this.exec("reduce", newf, initialize);
    else
      return this.exec("reduce", newf);
  },

  forEach:function(f)
  {
    var newf = function(prev, cur)
    {
      f(cur);
    };

    return this.exec("reduce", newf, undefined);
  },

  forEachActor:function(f)
  {
    var newf = function(prev, cur)
    {
      f(cur);
    };

    return this.exec("reduceActor", newf, undefined);
  },

  //FIXME: 这里得到的是actor，而actor完全不知道他所属的那个node，这也就是完全丧失了对node的控制能力��
  serializeChildren:function(arr, filter)
  {
    return this.exec("reduce", 
                     function(prev, n)
                     {
                       if (filter == undefined || filter(n))
                         prev.push(n);

                       return prev;
                     },
                     arr);
  },

  serializeChildrenActors:function(arr, filter)
  {
    return this.exec("reduce", 
                     function(prev, n)
                     {
                       var actor = n.exec("actor");
                       if (actor != undefined && (filter == undefined || filter(actor)))
                         prev.push(actor);

                       return prev;
                     },
                     arr);
  }
});

var NTreeNode = Klass.extend([NtreeNodeTrait]);

exports.Actor = Actor;
exports.NTreeNode = NTreeNode;

}};